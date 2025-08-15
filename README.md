# Job Application Tracker

A minimalist job board application built with React, TypeScript, and Tailwind CSS that helps you track your job applications through different stages.

## Features

- **4-Column Kanban Board**: Track jobs through Applied, Interview, Offer, and Rejected stages
- **Drag & Drop**: Easily move job cards between columns
- **Clean Design**: Minimalist UI with modern typography (Inter font)
- **Responsive**: Works on desktop and mobile devices
- **TypeScript**: Full type safety throughout the application
- **Magic UI Inspired Components**: Clean, modern component library

## Technology Stack

- **React 19** with TypeScript
- **@dnd-kit** for drag and drop functionality
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Custom UI Components** inspired by Magic UI

## Getting Started

1. **Navigate to the project:**
   ```bash
   cd job-board
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open your browser to:**
   ```
   http://localhost:3000
   ```

## Project Structure

```
job-board/src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── JobBoard.tsx        # Main board component
│   ├── JobColumn.tsx       # Column container
│   └── JobCard.tsx         # Individual job card
├── data/
│   └── sampleJobs.ts       # Sample job data
├── lib/
│   └── utils.ts           # Utility functions
├── types/
│   └── job.ts             # TypeScript types
└── App.tsx                # Root component
```

## Features Overview

### Job Card Information
Each job card displays:
- Job title and company
- Location
- Application date
- Salary range (if available)
- Job description preview
- Status badge with color coding

### Column Status Colors
- **Applied**: Blue theme
- **Interview**: Yellow theme
- **Offer**: Green theme
- **Rejected**: Red theme

### Drag & Drop Functionality
- Drag job cards between columns to update their status
- Smooth animations and visual feedback
- Maintains order within columns

## Future Enhancements

This frontend is ready for backend integration to:
- Connect to email inbox for automatic job detection
- Save job data to a database
- Add user authentication
- Export data functionality
- Email notifications and reminders

## Sample Data

The application comes pre-loaded with 8 sample job applications across all four stages to demonstrate the functionality.

## Development

To modify the application:

1. **Add new job statuses**: Update the `JobStatus` type in `src/types/job.ts`
2. **Customize styling**: Modify Tailwind classes or add custom CSS
3. **Add new fields**: Extend the `Job` interface and update components accordingly
4. **Change color scheme**: Update the color mappings in `JobColumn.tsx` and `JobCard.tsx`

The project is now complete and ready to run!