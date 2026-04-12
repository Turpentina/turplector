/**
 * Card images on GitHub Pages are loaded from the upstream raw CDN.
 * Local and other hosts use files under backend/.
 */
function cardImageUrl(imagePath) {
    if (!imagePath) return "";
    const onGitHubPages = /\.github\.io$/i.test(location.hostname);
    if (onGitHubPages) {
        return `https://raw.githubusercontent.com/Turpentina/turplector/main/backend/${imagePath}`;
    }
    return `backend/${imagePath}`;
}
