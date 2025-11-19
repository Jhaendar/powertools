# Dev Tools Website

A modern collection of developer tools built with **React 19**, **Vite**, **TypeScript**, and **shadcn/ui**. This project provides a fast, responsive interface for common development tasks.

## 🚀 Features

- **JSON Tools**: Convert, visualize, and generate TypeScript types from JSON
- **CSV Viewer**: Interactive CSV data viewer
- **Diff Checker**: Compare text and view differences
- **Fast Development**: Powered by Vite for instant HMR
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript support
- **Comprehensive Testing**: Unit and integration tests with Vitest
- **Responsive Design**: Mobile-first, works on all devices

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

## 🛠️ Getting Started

### Installation

```bash
npm install
```

### Development

Run the app in development mode with hot module replacement:

```bash
npm run dev
# or
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload automatically when you make edits.

### Building for Production

Build the app for production:

```bash
npm run build
```

This will:
1. Run TypeScript compiler to check types
2. Build the app using Vite
3. Output optimized files to the `build/` folder

The build is minified and optimized for best performance.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## 🧪 Testing

### Run Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci

# Run with coverage
npm run test:coverage

# Run comprehensive test suite
npm run test:comprehensive
```

### Test Coverage

Generate and view test coverage reports:

```bash
npm run test:coverage:ci
```

Coverage reports will be available in the `coverage/` directory.

## 📦 Deployment

### GitHub Pages

Deploy to GitHub Pages:

```bash
npm run deploy
```

This will build and deploy to the `gh-pages` branch.

### Verify Deployment

Check if the build is correctly configured for deployment:

```bash
npm run verify:deployment
```

## 🏗️ Project Structure

```
powertools/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── Layout/        # Layout components
│   │   ├── DiffChecker/   # Diff tool
│   │   ├── JSONConverter/ # JSON tools
│   │   └── ...
│   ├── contexts/          # React contexts
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   ├── __tests__/         # Integration tests
│   ├── App.tsx            # Main app component
│   └── index.tsx          # Entry point
├── scripts/               # Build and deployment scripts
├── public/                # Static assets
└── build/                 # Production build output
```

## 🔧 Technology Stack

### Core

- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool and dev server

### UI & Styling

- **Tailwind CSS 4** - Utility-first CSS
- **Radix UI** - Unstyled, accessible components
- **shadcn/ui** - Re-usable component library
- **Lucide React** - Icon library

### Testing

- **Vitest** - Unit testing framework
- **Testing Library** - React testing utilities
- **jsdom** - DOM testing environment

### Routing & State

- **React Router 7** - Client-side routing
- **Context API** - State management

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm start` | Alias for dev |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:ci` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm run deploy` | Deploy to GitHub Pages |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Links

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
