using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace TokenRateApp
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static Process serverProcess;
        private static string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        private static string appUrl = "http://localhost:3000";
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                bool isNewInstance;
                singleInstanceMutex = new Mutex(true, @"Local\TokenRate_Hermes_Launcher_Mutex", out isNewInstance);

                if (!isNewInstance)
                {
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
                File.AppendAllText(Path.Combine(appDir, "launcher_error.log"), "[" + DateTime.Now + "] " + ex.ToString() + "\n");
                MessageBox.Show("Launcher error:\n" + ex.Message, "TokenRate Launcher Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void EnsureServerRunning()
        {
            if (IsServerAlive()) return;

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npm.cmd start";
                psi.WorkingDirectory = appDir;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                serverProcess = Process.Start(psi);

                // Wait up to 15 seconds for server to respond
                for (int i = 0; i < 30; i++)
                {
                    Thread.Sleep(300);
                    if (IsServerAlive()) return;
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(Path.Combine(appDir, "launcher_error.log"), "[" + DateTime.Now + "] " + ex.ToString() + "\n");
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

        static void LaunchAppWindow()
        {
            string chrome = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chrome))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = chrome;
                    psi.Arguments = "--app=" + appUrl;
                    Process.Start(psi);
                    return;
                }
                catch { }
            }

            try
            {
                Process.Start(appUrl);
            }
            catch { }
        }

        static void SetupTray()
        {
            ContextMenu contextMenu = new ContextMenu();
            contextMenu.MenuItems.Add("Open App", (s, e) => LaunchAppWindow());
            contextMenu.MenuItems.Add("Open in Browser", (s, e) => Process.Start(appUrl));
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
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.DoubleClick += (s, e) => LaunchAppWindow();
        }

        static void KillServer()
        {
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
