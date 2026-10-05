using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace TokenRateApp
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static Process serverProcess;
        private static string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        private static string appUrl = "http://localhost:3000";
        private static Mutex singleInstanceMutex;

        private static void Log(string msg)
        {
            try
            {
                File.AppendAllText(Path.Combine(appDir, "launcher.log"), "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] " + msg + "\r\n");
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            try
            {
                Log("Launcher started.");
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                bool isNewInstance;
                singleInstanceMutex = new Mutex(true, @"Local\TokenRate_Hermes_Launcher_Mutex", out isNewInstance);

                if (!isNewInstance)
                {
                    Log("Another instance is running. Ensuring server and opening app window...");
                    if (!IsServerAlive())
                    {
                        EnsureServerRunning();
                    }
                    LaunchAppWindow();
                    return;
                }

                // Ensure production build and start server
                EnsureServerRunning();

                // Setup Tray Icon
                SetupTray();

                // Launch Browser / App Window
                LaunchAppWindow();

                // Run Application message loop
                Application.Run();

                // Cleanup on exit
                Cleanup();
            }
            catch (Exception ex)
            {
                Log("Fatal Exception: " + ex.ToString());
                MessageBox.Show("Launcher error:\n" + ex.Message, "TokenRate Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void EnsureServerRunning()
        {
            if (IsServerAlive())
            {
                Log("Server is already alive on port 3000.");
                return;
            }

            try
            {
                Log("Starting Next.js server via npm start...");
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npm.cmd start > server.log 2>&1";
                psi.WorkingDirectory = appDir;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                serverProcess = Process.Start(psi);

                // Wait up to 30 seconds for server to respond
                for (int i = 0; i < 60; i++)
                {
                    Thread.Sleep(500);
                    if (IsServerAlive())
                    {
                        Log("Server became alive on attempt " + (i + 1));
                        return;
                    }
                }

                Log("Server failed to respond within 30 seconds.");
                string serverLogSnippet = "";
                string serverLogPath = Path.Combine(appDir, "server.log");
                if (File.Exists(serverLogPath))
                {
                    try { serverLogSnippet = "\n\nServer log:\n" + File.ReadAllText(serverLogPath); } catch { }
                }
                MessageBox.Show("Could not start Next.js server within 30 seconds." + serverLogSnippet, "TokenRate Server Timeout", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                Log("EnsureServerRunning error: " + ex.ToString());
                MessageBox.Show("Could not start Next.js server:\n" + ex.Message, "TokenRate Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static bool IsServerAlive()
        {
            try
            {
                using (System.Net.Sockets.Socket socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp))
                {
                    socket.Blocking = false;
                    try
                    {
                        socket.Connect(new IPEndPoint(IPAddress.Loopback, 3000));
                        return true;
                    }
                    catch (System.Net.Sockets.SocketException se)
                    {
                        if (se.NativeErrorCode == 10035) // WSAEWOULDBLOCK
                        {
                            return socket.Poll(150000, System.Net.Sockets.SelectMode.SelectWrite); // 150ms
                        }
                        return false;
                    }
                }
            }
            catch
            {
                return false;
            }
        }

        static string GetDefaultBrowserExe()
        {
            try
            {
                using (RegistryKey userChoice = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice"))
                {
                    if (userChoice != null)
                    {
                        string progId = userChoice.GetValue("ProgId") as string;
                        if (!string.IsNullOrEmpty(progId))
                        {
                            using (RegistryKey cmdKey = Registry.ClassesRoot.OpenSubKey(progId + @"\shell\open\command"))
                            {
                                if (cmdKey != null)
                                {
                                    string cmd = cmdKey.GetValue("") as string;
                                    if (!string.IsNullOrEmpty(cmd))
                                    {
                                        if (cmd.StartsWith("\""))
                                        {
                                            int endQuote = cmd.IndexOf('\"', 1);
                                            if (endQuote > 1) return cmd.Substring(1, endQuote - 1);
                                        }
                                        int space = cmd.IndexOf(' ');
                                        return space > 0 ? cmd.Substring(0, space) : cmd;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log("GetDefaultBrowserExe error: " + ex.Message);
            }
            return null;
        }

        static void LaunchAppWindow()
        {
            Log("LaunchAppWindow called.");

            // 1. Try registered default browser with --app if Chromium
            string defaultBrowser = GetDefaultBrowserExe();
            if (!string.IsNullOrEmpty(defaultBrowser) && File.Exists(defaultBrowser))
            {
                string lower = defaultBrowser.ToLower();
                if (lower.Contains("vivaldi") || lower.Contains("chrome") || lower.Contains("msedge") || lower.Contains("brave") || lower.Contains("opera"))
                {
                    try
                    {
                        Log("Launching default Chromium browser in app mode: " + defaultBrowser);
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = defaultBrowser;
                        psi.Arguments = "--app=" + appUrl;
                        Process.Start(psi);
                        return;
                    }
                    catch (Exception ex)
                    {
                        Log("Failed to launch default browser in app mode: " + ex.Message);
                    }
                }
            }

            // 2. Try Vivaldi explicitly
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string vivaldi = Path.Combine(localAppData, @"Vivaldi\Application\vivaldi.exe");
            if (File.Exists(vivaldi))
            {
                try
                {
                    Log("Launching Vivaldi in app mode: " + vivaldi);
                    ProcessStartInfo psi = new ProcessStartInfo(vivaldi, "--app=" + appUrl);
                    Process.Start(psi);
                    return;
                }
                catch (Exception ex)
                {
                    Log("Failed to launch Vivaldi: " + ex.Message);
                }
            }

            // 3. Try Edge
            string edge = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edge))
            {
                try
                {
                    Log("Launching Edge in app mode: " + edge);
                    ProcessStartInfo psi = new ProcessStartInfo(edge, "--app=" + appUrl);
                    Process.Start(psi);
                    return;
                }
                catch (Exception ex)
                {
                    Log("Failed to launch Edge: " + ex.Message);
                }
            }

            // 4. Try Chrome
            string chromeProg = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            string chromeLocal = Path.Combine(localAppData, @"Google\Chrome\Application\chrome.exe");
            string chrome = File.Exists(chromeProg) ? chromeProg : (File.Exists(chromeLocal) ? chromeLocal : null);
            if (chrome != null)
            {
                try
                {
                    Log("Launching Chrome in app mode: " + chrome);
                    ProcessStartInfo psi = new ProcessStartInfo(chrome, "--app=" + appUrl);
                    Process.Start(psi);
                    return;
                }
                catch (Exception ex)
                {
                    Log("Failed to launch Chrome: " + ex.Message);
                }
            }

            // 5. Fallback via Windows ShellExecute
            try
            {
                Log("Fallback: launching via ShellExecute.");
                ProcessStartInfo psi = new ProcessStartInfo(appUrl);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                Log("ShellExecute fallback error: " + ex.Message);
            }
        }

        static void SetupTray()
        {
            ContextMenu contextMenu = new ContextMenu();
            contextMenu.MenuItems.Add("Open App", (s, e) => LaunchAppWindow());
            contextMenu.MenuItems.Add("Open in Browser", (s, e) => {
                try {
                    ProcessStartInfo psi = new ProcessStartInfo(appUrl);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                } catch { }
            });
            contextMenu.MenuItems.Add("-");
            contextMenu.MenuItems.Add("Restart Server", (s, e) => {
                KillServer();
                EnsureServerRunning();
                LaunchAppWindow();
            });
            contextMenu.MenuItems.Add("Exit", (s, e) => {
                Cleanup();
                Application.Exit();
            });

            trayIcon = new NotifyIcon();
            trayIcon.Text = "AI Model Directory (TokenRate)";
            trayIcon.ContextMenu = contextMenu;
            trayIcon.Visible = true;

            string iconPath = Path.Combine(appDir, "app.ico");
            if (File.Exists(iconPath))
            {
                try { trayIcon.Icon = new Icon(iconPath); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                try { trayIcon.Icon = Icon.ExtractAssociatedIcon(Process.GetCurrentProcess().MainModule.FileName); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }

            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();
        }

        static void KillServer()
        {
            Log("KillServer called.");
            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /T /PID " + serverProcess.Id);
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    Process p = Process.Start(psi);
                    if (p != null) p.WaitForExit();
                }
                catch { }
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("powershell", "-NoProfile -Command \"Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }\"");
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                Process p = Process.Start(psi);
                if (p != null) p.WaitForExit();
            }
            catch { }
        }

        static void Cleanup()
        {
            Log("Cleanup called.");
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            KillServer();
            if (singleInstanceMutex != null)
            {
                singleInstanceMutex.Dispose();
            }
        }
    }
}
