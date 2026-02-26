const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", async (req, res) => {
  try {
    const { title, fileName, fileContent, user_id, category } = req.body;

    if (!title || !fileName || !fileContent || !user_id) {
      return res.status(400).json({ error: "Missing data" });
    }

    // 1️⃣ Ensure user exists in profiles table
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!existingProfile) {
      // Create minimal profile
      await supabase.from("profiles").insert([{ id: user_id, name: "Anonymous" }]);
    }

    // 2️⃣ Upload file to storage bucket 'artworks'
    const buffer = Buffer.from(fileContent, "base64");
    const { error: storageError } = await supabase.storage
      .from("artworks")
      .upload(fileName, buffer, { upsert: true });

    if (storageError) return res.status(500).json({ error: storageError.message });

    const fileUrl = supabase.storage
      .from("artworks")
      .getPublicUrl(fileName).data.publicUrl;

    // 3️⃣ Insert into artworks table
    const { data, error } = await supabase
      .from("artworks")
      .insert([{ user_id, title, file_url: fileUrl, category }]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Uploaded successfully!", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;