import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../models/Company';

// Load environment variables
dotenv.config();

interface ApiCompany {
    alias: string;
    name: string;
    name_en: string;
    name_lower: string;
    id: string;
    comp_id: number;
    branch_id: number;
    branch_name: string;
    has_logo: boolean;
    logo: string;
    modifiedLogo: string;
    membership_alias: string;
    membership_title: string;
    mlevel: number;
    jobs_count: number;
    last_job: string;
    follower_count: number;
    staffs_cnt: number;
    expire: string;
    updated: string;
}

interface ApiResponse {
    message: string;
    items: ApiCompany[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        nextPage: number | null;
        prevPage: number | null;
    };
}

const fetchCompanies = async (page: number = 1): Promise<ApiResponse> => {
    const url = `https://new-api.zangia.mn/api/company/list?page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
    }

    return await response.json();
};

const importCompanies = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB Connected');

        let currentPage = 1;
        let hasNextPage = true;
        let totalImported = 0;

        while (hasNextPage) {
            console.log(`Fetching page ${currentPage}...`);

            const data = await fetchCompanies(currentPage);

            // Map and save companies
            const companies = data.items.map((item: ApiCompany) => ({
                alias: item.alias,
                name: item.name,
                name_en: item.name_en,
                industry: item.branch_name,
                modified_logo: item.modifiedLogo
            }));

            // Insert companies (skip duplicates)
            for (const company of companies) {
                try {
                    await Company.findOneAndUpdate(
                        { name: company.name }, // Find by name
                        company, // Update with new data
                        { upsert: true, new: true } // Create if doesn't exist
                    );
                    totalImported++;
                } catch (err: any) {
                    console.error(`Error saving company ${company.name}:`, err.message);
                }
            }

            console.log(`Page ${currentPage} completed. ${companies.length} companies processed.`);
            console.log(`Total imported so far: ${totalImported}`);

            hasNextPage = data.meta.hasNextPage;
            currentPage++;

            // Optional: Add a small delay to avoid rate limiting
            if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`\nImport completed! Total companies imported: ${totalImported}`);

    } catch (error) {
        console.error('Error importing companies:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

// Run the import
importCompanies();
