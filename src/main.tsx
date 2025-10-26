import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AdMob, BannerAdPosition } from '@capacitor-community/admob';
import { initializeAdMobIfNeeded, showInterstitialAd } from './lib/utils.ts';

// Initialize AdMob when the app starts and then show a banner
// const initializeAdMob = async () => {
//   try {
//     // await AdMob.initialize({
//     //   initializeForTesting: true,
//     // });
//     await initializeAdMobIfNeeded();
//     console.log('AdMob initialized');
//   } catch (e) {
//     console.error('AdMob initialize error:', e);
//   }
// };

// Function to create and show a banner ad
const showBannerAd = async () => {
  // Remove any existing banner ads to prevent duplicates
  await AdMob.removeBanner();

  // Create a new banner ad
  AdMob.showBanner({
    adId: 'ca-app-pub-3940256099942544/6300978111', // Test AdMob banner ad ID
    position: BannerAdPosition.TOP_CENTER,
    npa: true, // Non-personalized ads
    // Adjust margins to allow overlap with content
    margin: 0
  })
    .then(() => {
      console.log("AdMob banner ad loaded successfully.");
    })
    .catch(e => {
      console.error("Error loading AdMob banner ad:", e);
    });
};

// Function to hide the banner ad
const hideBannerAd = async () => {
  await AdMob.hideBanner();
  console.log("AdMob banner ad hidden.");
};

// Function to remove the banner ad
const removeBannerAd = async () => {
  await AdMob.removeBanner();
  console.log("AdMob banner ad removed.");
};

// Ensure initialization completes before showing the banner
(async () => {
  // await initializeAdMob();
  await initializeAdMobIfNeeded(); // Call the shared function directly
  // Slight delay to give the SDK time to settle on some devices
  //   setTimeout(() => {
  //     showBannerAd();
  //   }, 500);
})();
  
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
