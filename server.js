const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Plant identification endpoint
app.post('/api/identify', async (req, res) => {
    try {
        const { base64Image } = req.body;
        
        if (!base64Image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // Remove data:image/jpeg;base64, prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

        const response = await fetch(process.env.PLANT_ID_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': process.env.PLANT_ID_API_KEY
            },
            body: JSON.stringify({
                images: [base64Data],
                plant_language: "en",
                plant_details: [
                    "common_names",
                    "url",
                    "wiki_description",
                    "taxonomy",
                    "rank",
                    "gbif_id",
                    "inaturalist_id",
                    "synonyms",
                    "edible_parts",
                    "watering",
                    "propagation_methods"
                ],
                disease_details: [
                    "common_names",
                    "description",
                    "treatment",
                    "classification",
                    "symptoms",
                    "causes",
                    "prevention"
                ]
            })
        });

        const data = await response.json();
        
        // Process and format the response
        const suggestion = data.suggestions?.[0] || {};
        const plantDetails = suggestion.plant_details || {};
        
        const result = {
            confidence: (suggestion.probability * 100).toFixed(2) + "%",
            plantType: suggestion.plant_name || 'Unknown plant',
            commonNames: plantDetails.common_names?.join(", ") || 'No common names found',
            scientificName: suggestion.plant_name,
            taxonomy: plantDetails.taxonomy || {},
            description: plantDetails.wiki_description?.value || 'No description available',
            careInstructions: {
                watering: plantDetails.watering?.description || 'Water regularly as needed',
                propagation: plantDetails.propagation_methods?.join(", ") || 'Standard propagation methods apply',
                edibleParts: plantDetails.edible_parts?.join(", ") || 'No edible parts information available'
            },
            diseases: data.health_assessment?.diseases?.map(disease => ({
                name: disease.name,
                probability: (disease.probability * 100).toFixed(2) + "%",
                description: disease.description || '',
                treatment: disease.treatment?.join(". ") || 'No specific treatment information available',
                prevention: disease.prevention?.join(". ") || 'Follow general plant care guidelines'
            })) || [],
            similarImages: suggestion.similar_images || []
        };

        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process the image' });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});