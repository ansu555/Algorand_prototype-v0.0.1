# Spline 3D Scene Setup

## How to Export Your Spline Scene

1. **Open Spline**: Go to [spline.design](https://spline.design) and open your `reactive_orb.spline` file
2. **Export for Web**: 
   - Click on the "Export" button
   - Select "Web" as the export format
   - Copy the provided URL (it will look like: `https://prod.spline.design/your-scene-url/scene.splinecode`)

3. **Update the Landing Page**:
   - Open `components/landing-page.tsx`
   - Find the line: `const SPLINE_SCENE_URL = "https://prod.spline.design/your-scene-url/scene.splinecode"`
   - Replace the placeholder URL with your actual exported scene URL

## Current Status

✅ Spline React package is installed (`@splinetool/react-spline`)  
✅ Landing page component is created with Spline integration  
✅ All sections are implemented as requested  
⏳ **Next Step**: Export your Spline scene and update the URL

## Landing Page Sections

1. **Hero Section**: Full-screen Spline 3D scene with overlay content
2. **Screenshot Section**: 16:9 aspect ratio placeholder for app screenshot
3. **Workflow Section**: "Empower your workflow" with 3 cards
4. **Features Section**: 5 key features with icons and descriptions
5. **FAQ Section**: 9 frequently asked questions and answers
6. **CTA Section**: Call-to-action with buttons

The landing page is fully responsive and includes dark mode support.
