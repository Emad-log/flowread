# FlowRead - RSVP Speed Reader Design Document

## App Overview
FlowRead is a minimal, aesthetic mobile app that uses Rapid Serial Visual Presentation (RSVP) technology to help users read faster. The app integrates with Open Library API for accessing free books and allows users to build their personal reading library.

## Design Philosophy
- **Extremely Minimal**: Clean interfaces with generous whitespace
- **Focus-First**: The reading experience takes center stage
- **Distraction-Free**: No clutter, only essential elements
- **Smooth Transitions**: Fluid animations between screens and states

---

## Screen List

### 1. Home Screen (Library Tab)
**Primary Content:**
- User's personal book library displayed as elegant cards
- Empty state with invitation to discover books
- Reading progress indicators on each book

**Functionality:**
- Tap book to continue reading
- Long-press for options (remove, details)
- Pull-to-refresh library

### 2. Discover Screen (Search Tab)
**Primary Content:**
- Search bar at top
- Trending/Popular books section
- Search results as book cards
- Book cover, title, author preview

**Functionality:**
- Search Open Library API
- Tap book to view details
- Add to library button

### 3. Book Detail Screen
**Primary Content:**
- Large book cover
- Title, author, description
- Page count, publish year
- Add to Library / Read Now buttons

**Functionality:**
- Fetch book content from Open Library/Gutenberg
- Add book to personal library
- Start RSVP reading session

### 4. RSVP Reader Screen
**Primary Content:**
- Single word display (large, centered)
- Minimal progress indicator
- Speed control (WPM)
- Play/Pause control

**Functionality:**
- Display words one at a time at set WPM
- Tap to pause/resume
- Swipe up/down to adjust speed
- Track reading position
- ORP (Optimal Recognition Point) highlighting

### 5. Settings Screen (Profile Tab)
**Primary Content:**
- Reading speed preference (default WPM)
- Theme toggle (light/dark)
- Font size preference
- Reading statistics

**Functionality:**
- Persist settings to AsyncStorage
- View total words read, books completed

---

## Key User Flows

### Flow 1: Discover and Add Book
1. User taps "Discover" tab
2. Types search query in search bar
3. Results appear as book cards
4. User taps a book card
5. Book Detail screen slides up
6. User taps "Add to Library"
7. Success feedback, book appears in Library

### Flow 2: Start Reading with RSVP
1. User taps book in Library
2. RSVP Reader opens with book content
3. Tap anywhere to start/pause
4. Words flash one at a time
5. Swipe up to increase speed, down to decrease
6. Progress saves automatically
7. Tap back to return to Library

### Flow 3: Adjust Reading Settings
1. User taps "Settings" tab
2. Adjusts default WPM with slider
3. Toggles theme preference
4. Changes persist immediately

---

## Color Choices

### Light Theme
- **Background**: `#FAFAFA` (warm off-white)
- **Surface**: `#FFFFFF` (pure white cards)
- **Foreground**: `#1A1A1A` (near black text)
- **Muted**: `#8E8E93` (iOS system gray)
- **Primary**: `#007AFF` (iOS blue for actions)
- **Border**: `#E5E5EA` (subtle dividers)
- **Accent**: `#FF9500` (warm orange for highlights/ORP)

### Dark Theme
- **Background**: `#000000` (true black for OLED)
- **Surface**: `#1C1C1E` (elevated surfaces)
- **Foreground**: `#FFFFFF` (white text)
- **Muted**: `#8E8E93` (system gray)
- **Primary**: `#0A84FF` (iOS blue dark mode)
- **Border**: `#38383A` (subtle dividers)
- **Accent**: `#FF9F0A` (warm orange)

---

## Typography

- **Display (RSVP Word)**: 48-64px, bold, system font
- **Heading**: 24-28px, semibold
- **Body**: 16-17px, regular
- **Caption**: 13-14px, regular, muted color

---

## Component Patterns

### Book Card
- Rounded corners (16px)
- Subtle shadow on light, no shadow on dark
- Book cover image (2:3 aspect ratio)
- Title below (max 2 lines)
- Author below title (muted, 1 line)
- Progress bar at bottom if in library

### RSVP Display
- Centered word with ORP letter highlighted
- Minimal chrome - just the word
- Tap anywhere to pause
- Speed indicator appears briefly on change
- Progress as thin line at bottom

### Empty States
- Simple illustration or icon
- Brief, friendly message
- Clear call-to-action button

---

## Animations & Transitions

- **Screen transitions**: Slide from right (iOS standard)
- **Modal presentations**: Slide from bottom
- **Word changes**: Instant (no animation for RSVP)
- **Speed changes**: Brief overlay fade in/out
- **Button presses**: Scale 0.97 with haptic feedback
- **List items**: Opacity 0.7 on press

---

## Data Storage (Local)

Using AsyncStorage for:
- User's book library (book metadata + content)
- Reading progress per book
- User preferences (WPM, theme, font size)
- Reading statistics

No backend required - fully offline capable after book download.
