const express = require("express");
const axios = require("axios");
const router = express.Router();

// Example user profile (could later come from DB)
const userProfile = {
  interests: ["digital painting", "nature", "fantasy", "neon", "abstract"],
  pastArt: ["forest landscape", "dragon illustration", "neon cityscape", "space scene"],
};

// Predefined themes, colors, subjects
const themes = ["sunset", "stormy sky", "mystical forest", "underwater world", "cyberpunk city"];
const colors = ["vibrant", "pastel", "neon", "monochrome", "warm", "cool"];
const subjects = ["dragons", "robots", "flowers", "mountains", "fantasy creatures", "magical objects"];

// GET /ai/image?prompt=rose
router.get("/image", async (req, res) => {
  try {
    let { prompt } = req.query;

    // If no prompt provided, generate one based on userProfile (simple AI)
    if (!prompt) {
      const interest = userProfile.interests[Math.floor(Math.random() * userProfile.interests.length)];
      const theme = themes[Math.floor(Math.random() * themes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];

      prompt = `Create a ${color} ${theme} with ${subject} (${interest})`;
    }

    // Unsplash URL (redirects)
    const unsplashUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(prompt)}`;

    // Use Axios to follow redirect and get final image URL
    const response = await axios.get(unsplashUrl, { maxRedirects: 0 }).catch(err => {
      if (err.response && err.response.status === 302) {
        return err.response; // redirect response
      }
      throw err;
    });

    // Final image URL from redirect
    const finalImageUrl = response.headers.location || unsplashUrl;

    res.json({
      prompt,       // return the prompt used
      imageUrl: finalImageUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

module.exports = router;