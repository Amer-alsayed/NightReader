/**
 * Utility to handle fullscreen API with vendor prefixes.
 * Provides a unified interface for the Fullscreen API across different browsers.
 */

/**
 * Returns the element that is currently in fullscreen mode, if any.
 * @returns {Element|null} The element currently in fullscreen mode, or null if none.
 */
export const getFullscreenElement = () => {
    return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null
    );
};

/**
 * Requests fullscreen mode for the given element.
 * @param {Element} element The element to make fullscreen.
 * @returns {Promise<void>} A promise that resolves when fullscreen mode is entered.
 */
export const requestFullscreen = async (element) => {
    if (element.requestFullscreen) {
        return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        return element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
        return element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        return element.msRequestFullscreen();
    } else {
        throw new Error('Fullscreen API is not supported by this browser.');
    }
};

/**
 * Exits fullscreen mode.
 * @returns {Promise<void>} A promise that resolves when fullscreen mode is exited.
 */
export const exitFullscreen = async () => {
    if (document.exitFullscreen) {
        return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        return document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        return document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        return document.msExitFullscreen();
    } else {
        throw new Error('Fullscreen API is not supported by this browser.');
    }
};

/**
 * List of fullscreen change event names for different browsers.
 */
export const FULLSCREEN_EVENTS = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
];
