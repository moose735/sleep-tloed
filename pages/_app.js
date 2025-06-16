import '../styles/globals.css'; // Import your global Tailwind CSS styles

/**
 * Custom App Component (_app.js)
 * This component is used to initialize pages. It allows you to:
 * - Persist layout between page changes
 * - Keep state when navigating pages
 * - Inject global CSS like Tailwind CSS
 * - Add global data (e.g., from a context API)
 *
 * @param {object} { Component, pageProps } - Component is the active page,
 * pageProps is an object with the initial props that
 * were preloaded for your page by one of our data fetching methods.
 */
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
