(function () {
    const THEME_STORAGE_KEY = "tcg_theme";
    const DEFAULT_THEME = "fontaine";
    const THEMES = [
        { id: "mondstadt", label: "Mondstadt" },
        { id: "liyue", label: "Liyue" },
        { id: "inazuma", label: "Inazuma" },
        { id: "sumeru", label: "Sumeru" },
        { id: "fontaine", label: "Fontaine" }
    ];

    function getStoredTheme() {
        return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
    }

    function setTheme(theme) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        applyTheme(theme);
    }

    applyTheme(getStoredTheme());

    window.tcgTheme = { THEMES, DEFAULT_THEME, getStoredTheme, applyTheme, setTheme };
})();
