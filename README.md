# SecureFileVault

A modern, secure file storage and sharing platform built with React, TypeScript, and Express. SecureFileVault provides enterprise-grade security features while maintaining an intuitive user experience.

## Features

### Security
- 🔐 AES-256 file encryption
- 🔑 Password protection for sensitive files
- 🔒 Secure authentication system with JWT
- 🛡️ Role-based access control

### File Management
- 📤 Drag-and-drop file uploads
- 📁 Intuitive file organization
- 🔄 Quick access to recent files
- 🗑️ Trash bin for deleted files
- 📊 File size and type management
- 💾 Support for large files (up to 100MB)

### Sharing & Collaboration
- 🤝 File sharing capabilities
- 👥 Team file access
- 🔗 Customizable access levels:
  - Private (only owner)
  - Shared (specific users)
  - Public (anyone with link)

### User Interface
- 🎨 Modern, responsive design
- 📱 Mobile-friendly interface
- ⚡ Real-time updates
- 🔔 Toast notifications for actions
- 📊 File information display
- 🌓 Clean, intuitive layout

## Tech Stack

### Frontend
- React
- TypeScript
- TailwindCSS
- Radix UI Components
- React Query
- Lucide Icons

### Backend
- Express.js
- Node.js
- JWT Authentication
- Multer (file handling)
- DrizzleORM

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SecureFileVault.git
cd SecureFileVault
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
```

3. Start the development servers:

```bash
# Start the backend server (from root directory)
npm run dev

# Start the frontend development server (from client directory)
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Usage

1. Register an account or login
2. Upload files through drag-and-drop or file browser
3. Configure security settings for each file:
   - Enable/disable encryption
   - Set password protection
   - Choose access level
4. Manage files through the dashboard
5. Share files with team members
6. Access shared files in the team section

## Security Features

### File Encryption
- AES-256 encryption for sensitive files
- Client-side password protection
- Secure key management

### Access Control
- JWT-based authentication
- Role-based access control
- Granular file permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for UI components
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Lucide](https://lucide.dev/) for icons
- [React Query](https://tanstack.com/query/latest) for data fetching 