const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            return cb(new Error('Only images are allowed'));
        }
    }
});

// Middleware to handle Multer errors
const errorsHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('File is too large. Maximum allowed size is 5MB.');
        }
    } else if (err) {
        return res.status(400).send(err.message); // Handle other validation errors
    }
    next();
};

module.exports = upload; // Export both upload and error handler]