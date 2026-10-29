const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getMyCVs, getCVById, createCV, updateCV, deleteCV, getAllCVs, uploadAndParseCV } = require('../controllers/cv.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|docx|doc|txt|json|png|jpg|jpeg|webp)$/i;
    if (allowed.test(file.originalname) || (file.mimetype && (file.mimetype.includes('pdf') || file.mimetype.includes('word') || file.mimetype.includes('text') || file.mimetype.startsWith('image/')))) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file định dạng PDF, Word (DOCX/DOC), TXT, JSON hoặc Ảnh (PNG/JPG).'));
    }
  },
});

router.get('/admin/all', authenticate, authorize('admin'), getAllCVs);
router.get('/', authenticate, authorize('student'), getMyCVs);
router.get('/:id', authenticate, getCVById);
router.post('/upload-and-parse', authenticate, authorize('student'), upload.single('file'), uploadAndParseCV);
router.post('/', authenticate, authorize('student'), createCV);
router.put('/:id', authenticate, authorize('student'), updateCV);
router.delete('/:id', authenticate, deleteCV);

module.exports = router;

