# White Elephant Online Game - Backend

This repository contains the backend for the White Elephant Online Demo Game, built using NestJS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [Development Setup](#development-setup)
  - [Production Setup](#production-setup)
- [Environment Variables](#environment-variables)
- [Project Scripts](#project-scripts)
- [Tech Stack](#tech-stack)

## Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16.x or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Setup Instructions

### Development Setup

To run the backend in development mode:

1. Clone the repository:
   ```bash
   git clone <backend-repo-url>
   cd <backend-repo-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   - Copy the `.env.sample` file to `.env`:
     ```bash
     cp .env.sample .env
     ```
   - Edit the `.env` file with the required values (refer to `.env.sample` for details).

4. Start the development server:
   ```bash
   npm run start:dev
   # or
   yarn start:dev
   ```

5. The server will be running at [http://localhost:3000](http://localhost:3000).

### Production Setup

To deploy the backend in production mode:

1. Clone the repository and navigate to the folder:
   ```bash
   git clone <backend-repo-url>
   cd <backend-repo-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   - Copy the `.env.sample` file to `.env`:
     ```bash
     cp .env.sample .env
     ```
   - Edit the `.env` file with the required values.

4. Build the project:
   ```bash
   npm run build
   # or
   yarn build
   ```

5. Start the server:
   ```bash
   npm run start:prod
   # or
   yarn start:prod
   ```

6. The server will be running at [http://localhost:3000](http://localhost:3000).

## Environment Variables

The backend uses environment variables defined in the `.env` file. Refer to the `.env.sample` file for the required variables and their descriptions.

## Project Scripts

Here are the commonly used scripts:

- `npm run start:dev`: Starts the development server.
- `npm run build`: Builds the project for production.
- `npm run start:prod`: Starts the production server.
- `npm run test`: Runs the tests.
- `npm run lint`: Lints the codebase.
- `npm run format`: Formats the codebase using Prettier.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **WebSocket Support**: The backend includes WebSocket functionality for real-time communication.
- **Database**: ( PostgreSQL)
