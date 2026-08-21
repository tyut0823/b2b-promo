const path = require('path');
const supabase = require('../config/supabase');
const env = require('../config/env');
const AppError = require('../utils/AppError');

async function uploadImage(file) {
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(filename, file.buffer, { contentType: file.mimetype });

  if (error) {
    throw new AppError(500, '이미지 업로드에 실패했습니다.');
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { uploadImage };
