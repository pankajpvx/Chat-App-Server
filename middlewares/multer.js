import multer from "multer";

const storage = multer.memoryStorage();

const multerUpload = multer({
  limits: {
    fieldSize: 1024 * 1024 * 5,
  },
  storage,
});

const singleAvatar = multerUpload.single("avatar");
const attachementsMulter = multerUpload.array("files", 5);

export { multerUpload, singleAvatar, attachementsMulter };
