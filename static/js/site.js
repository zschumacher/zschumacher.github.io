(function () {
    const element = document.getElementById("terminal-screen");

    if (!element) {
        return;
    }

    const shell = window.PortfolioShellCore.createShell();
    const terminal = window.PortfolioTerminalUI.createTerminal(element, shell);
    terminal.focus();
})();
