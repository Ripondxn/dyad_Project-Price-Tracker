# AI Development Rules

This document outlines the technology stack and development guidelines for this application.

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) - A React framework for building server-side rendered and static web applications.
- **Language**: JavaScript with React.
- **Styling**: Global CSS using a BEM-like naming convention. All styles are located in `styles/globals.css`.
- **Icons**: [Font Awesome](https://fontawesome.com/) is used for icons, included via a CDN link in `pages/index.js`.
- **API Routes**: Backend logic is handled through Next.js API routes located in the `pages/api/` directory.
- **Data Fetching**: The native `fetch` API is used for client-side data fetching from the API routes.
- **State Management**: Component-level state is managed using React's built-in `useState` and `useEffect` hooks.
- **Data**: Static product data is stored in `data/products.js` and served via the API routes.

## Library Usage and Coding Conventions

- **Styling**:
    - All new styles should be added to `styles/globals.css`.
    - Follow the existing CSS variable definitions (`:root`) for colors, fonts, and spacing.
    - Use the existing class naming patterns for consistency. Do not introduce CSS-in-JS or other styling libraries.

- **Icons**:
    - Continue to use Font Awesome for all icons. Find appropriate icons on their website and use the `fas` (Font Awesome Solid) classes.

- **State Management**:
    - Use the `useState` hook for simple, local component state.
    - For state that is shared between a few components, lift the state up to the nearest common ancestor.
    - Do not introduce a global state management library like Redux or Zustand.

- **Data Fetching**:
    - All client-side data fetching should use the `fetch` API.
    - Do not add data fetching libraries like SWR or React Query.

- **Components**:
    - Keep components small and focused on a single responsibility.
    - If new components are created, they should be placed in a `components/` directory.

- **Code Formatting**:
    - Maintain the existing code style. Use consistent indentation and spacing.