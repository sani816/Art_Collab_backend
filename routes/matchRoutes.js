const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/upload
router.post("/", async (req, res) => {
  try {
    const { title, fileName, fileContent, user_id, category } = req.body;

    if (!title || !fileName || !fileContent || !user_id) {
      return res.status(400).json({ error: "Missing data" });
    }

    // ✅ Ensure user exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!existingProfile) {
      await supabase.from("profiles").insert([{ id: user_id, full_name: "Anonymous" }]);
    }

    // ✅ Upload to Supabase Storage
    const buffer = Buffer.from(fileContent, "base64");
    const { error: storageError } = await supabase.storage
      .from("artworks")
      .upload(fileName, buffer, { upsert: true });

    if (storageError) return res.status(500).json({ error: storageError.message });

    const { data: fileUrlData } = supabase.storage
      .from("artworks")
      .getPublicUrl(fileName);

    const fileUrl = fileUrlData.publicUrl;

    // ✅ Insert into artworks table
    const { data, error } = await supabase
      .from("artworks")
      .insert([{ user_id, title, file_url: fileUrl, category, likes: 0 }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Uploaded successfully!", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;