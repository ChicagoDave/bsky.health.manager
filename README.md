# BlueSky Health Manager

BlueSky Health Manager is a web application that helps BlueSky/AT Protocol users analyze and manage their follower relationships. It provides tools to evaluate follower accounts based on various health metrics, identify potential spam or suspicious accounts, and take bulk actions like blocking or greylisting.

## Features

### Follower Analysis
- Automatic scanning of all follower accounts
- Real-time progress tracking during analysis
- Multiple health metrics tracked per account:
  - Post count verification (identifies accounts with no posts)
  - Handle pattern analysis (flags handles with suspicious number patterns)
  - Follower/following ratio analysis
  - Profile completeness check (avatar, display name, etc.)
  - Last activity tracking

### Management Tools
- Advanced filtering system with multiple categories
- Batch selection tools:
  - Select all filtered accounts
  - Select accounts without issues
  - Clear selection
- Bulk actions:
  - Block multiple accounts simultaneously
  - Add accounts to greylist for monitoring
  - Export selected accounts to CSV

### Smart Lists
- Whitelist system for trusted accounts
  - Automatic whitelisting of mutual follows
  - Manual whitelisting capability
  - Whitelist persistence across sessions
- Greylist system for suspicious but not blocked accounts
  - Manual greylisting of accounts
  - Easy monitoring of greylisted accounts

### Security Features
- OAuth 2.0 authentication with AT Protocol
- Access control system with whitelisting
- Secure session management
- Automatic token refresh handling

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query
- **AT Protocol Integration**: @atproto/api
- **Authentication**: @atproto/oauth-client-browser
- **Build Tool**: Vite
- **Package Manager**: npm/yarn

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A BlueSky account
- Access to BlueSky's API (through bsky.social or a self-hosted PDS)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ChicagoDave/bsky.health.manager.git
cd bsky-health-manager
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Configure environment variables:
Create a `.env` file in the root directory with:
```env
VITE_APP_URL=https://your-deployment-url.com
VITE_BSKY_SERVICE=https://bsky.social
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Configuration

### OAuth Setup

The application uses OAuth for authentication. You'll need to configure your OAuth client metadata in `client-metadata.json`:

```json
{
  "client_id": "https://your-app-url.com/client-metadata.json",
  "client_name": "BSky Health Manager",
  "redirect_uris": ["https://your-app-url.com/"],
  "scope": "transition:generic atproto transition:chat.bsky",
  "grant_types": ["authorization_code", "refresh_token"],
  "application_type": "web",
  "token_endpoint_auth_method": "none",
  "dpop_bound_access_tokens": true
}
```

### Access Control

By default, the application uses an access control system to manage who can use the tool. You can modify this in the `services/access-control.ts` file. There is a server side config file that contains whitelisted handles.

## Deployment

1. Build the production version:
```bash
npm run build
# or
yarn build
```

2. Deploy the contents of the `dist` directory to your web server.

3. Configure your web server to handle SPA routing by redirecting all requests to `index.html`.

## Development

### Project Structure

```
src/
├── components/        # React components
│   ├── followers/     # Follower management components
│   └── ...
├── services/         # Business logic and API interactions
├── types/           # TypeScript type definitions
└── App.tsx          # Main application component
```

### Adding New Rules

To add new follower analysis rules, modify `src/types/bsky.ts`:

```typescript
export const filterRules: FilterRule[] = [
  {
    id: 'your_new_rule',
    name: 'Rule Display Name',
    description: 'Rule Description',
    check: (profile) => /* your rule logic */
  },
  // ... existing rules
]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

GNU GENERAL PUBLIC LICENSE

## Acknowledgments

- Built with [AT Protocol](https://atproto.com/)
- Uses [BlueSky Social](https://bsky.social) APIs
- Inspired by the BlueSky community's need for better account management tools

## Support

For support, please create an issue in the GitHub repository or contact the maintainers directly through BlueSky at @david-cornelson.bsky.social.