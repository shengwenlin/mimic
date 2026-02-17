

# Mimic — English Speaking Practice App for Chinese Product Designers

## Overview
A mobile-first English speaking practice app with 7 screens, clean minimalist design (white + blue #3B5BDB), hardcoded data, and interactive elements. All screens centered at max-width 390px.

## Visual Design System
- Pure white backgrounds, no shadows/gradients/decorative elements
- Primary blue #3B5BDB for all interactive elements
- Near-black #1A1A2E headings, #4A4A6A body text
- Pill-shaped buttons (50px radius), generous whitespace
- Bottom tab bar with blue active / grey inactive icons

## Screens & Features

### 1. Home Screen
- "Mimic" logo + avatar header
- Streak tracker with flame icon and 7-day dot indicator
- Today's lesson card: "Defending under pushback" with Start button
- 3 completed lesson rows with green checkmarks and scores
- Bottom tab navigation (Home / Map / Review / Progress)

### 2. Scene Intro Screen
- Lesson context with situation description box
- 3 skill tags as outlined pills (Assertive, Data-backed, Collaborative)
- 4-step progress indicator: Listen · Mimic · Review · Done
- "Start Listening" CTA button

### 3. Listen Screen
- Audio waveform animation (12 bars with CSS up-down animation)
- Transcript with key phrases underlined in blue
- Playback controls: rewind, play/pause, speed toggle
- 25% progress bar

### 4. Mimic Screen
- Target sentence with stressed words highlighted in bold blue
- Stressed syllable labels
- Recording zone that toggles between idle and recording states
- Recording state: blue border, pulse animation, "Recording..." text

### 5. Word Feedback Screen
- Circular score display (82) with progress ring animation
- Word-by-word scoring as colored pill chips (green/orange/red)
- Tappable chips that reveal pronunciation tips
- Saved phrases section with Chinese translations
- Improvement suggestion box

### 6. Review Screen (Flashcard)
- Tap-to-flip flashcard with Chinese prompt → English answer
- "Again" (grey) and "Got it" (blue) response buttons
- "Used at work this week?" prompt with YES / NOT YET options
- Card count header ("6 due")

### 7. Story Map Screen
- Vertical lesson timeline with status indicators
- Completed (blue check + score), current (highlighted), locked (grey + 🔒)
- Week sections with progress bar
- Week 2 shown dimmed/locked

## Interactions
- Screen-to-screen navigation via React Router with fade/slide transitions
- Recording toggle animation on Mimic screen
- Card flip animation on Review screen
- Tappable word chips with show/hide tips
- Bottom tab bar navigation across all screens

## Technical Approach
- Mobile-first layout, max-width 390px centered
- React + TypeScript + Tailwind CSS
- All lesson data hardcoded in constants
- CSS animations for waveform, pulse, card flip, and transitions

