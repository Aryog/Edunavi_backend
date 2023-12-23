const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const fs = require('fs');
const dbmodel = require("../Model/university")
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const upload = multer({ dest: path.join(__dirname, '../upload') });
// TODO check for if uploads is valid path or ../uploads/ is valid

router.get('/health', (req, res) => {
    res.status(200).send({ message: "Status is healthy" })
})
router.post('/create', async (req, res) => {
    try {
        const { org_name, org_uname, org_location, org_links, org_isArchived } = req.body;
        const validationError = new dbmodel({ org_uname, org_name }).validateSync();
        if (validationError) {
            return res.status(400).json({ error: validationError.message });
        }
        const newUniversity = new dbmodel({
            org_name,
            org_uname,
            org_location,
            org_links: org_links || [],
            org_isArchived: org_isArchived || false,
        })
        const savedUniversity = await newUniversity.save();
        res.json({ message: 'University created successfully', university: savedUniversity });
    } catch (error) {
        console.error('Error creating university:', error);
        res.status(500).json({ error: 'Error creating university' });
    }
})
router.post('/uploadLink/:orgUName', async (req, res) => {
    try {
        const orgNameToUpdate = req.params.orgUName;
        const links = req.body.org_links;
        const updatedDocument = await dbmodel.findOneAndUpdate(
            { org_uname: orgNameToUpdate },
            { $push: { org_links: { $each: links } } },
            { new: true }
        );
        if (updatedDocument) {
            res.json({ message: `Organization ${orgNameToUpdate} links updated successfully`, updatedDocument })
        } else {
            res.status(404).json({ message: `Organization with org_uname ${orgNameToUpdate} not found` });
        }
    } catch (error) {
        console.error('Error saving to database:', error);
        res.status(500).json({ error: 'Error saving to database' });
    }
})
router.post('/uploadFile/:orgUName', upload.single('file'), async (req, res) => {
    try {
        // Read the uploaded file
        const orgNameToUpdate = req.params.orgUName;
        const fileContent = fs.readFileSync(req.file.path);
        const timestamp = Date.now();
        const originalFilename = req.file.originalname;
        const newFilename = `${timestamp}_${originalFilename}`;
        // Set up S3 parameters
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `uploads/${orgNameToUpdate}/${newFilename}`,
            // ContentType: contentType // User want type 
        })
        const url = await getSignedUrl(s3Client, command);
        // should make a put request to aws link
        try {
            await axios.put(url, fileContent, {
                headers: {
                    'Content-Type': req.file.mimetype,
                },
            });
        } catch (error) {
            res.status(500).send({ message: "Can't upload the file" })
        }
        fs.unlinkSync(req.file.path);
        const updatedDocument = await dbmodel.findOneAndUpdate(
            { org_uname: orgNameToUpdate },
            { $push: { org_file_path: `uploads/${orgNameToUpdate}/${newFilename}` } },
            { new: true }
        );

        if (updatedDocument) {
            res.json({ message: `Organization ${orgNameToUpdate} updated successfully`, updatedDocument });
        } else {
            res.status(404).json({ message: `Organization with org_name ${orgNameToUpdate} not found` });
        }
    } catch (error) {
        console.error('Error uploading to s3 or saving to database:', error);
        res.status(500).json({ error: 'Error uploading to S3 or saving to database' });
    }
})

module.exports = router;