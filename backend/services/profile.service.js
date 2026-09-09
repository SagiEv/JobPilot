const profileRepository = require('../repositories/profile.repository');

const getProfile = async (userId, supabaseClient) => {
    const { data, error } = await profileRepository.findFirstProfile(userId, supabaseClient);

    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    let profile = data || {};

    const { data: experiencesData, error: expError } = await profileRepository.findUserExperiences(userId, supabaseClient);
    if (expError) throw new Error(expError.message);

    profile.experiences = experiencesData || [];

    // Transformation logic
    if (profile.cv_data) {
        profile.cvData = profile.cv_data;
        delete profile.cv_data;
    }
    if (profile.website) {
        profile.github = profile.website;
    }

    return profile;
};

const upsertProfile = async (userId, payload, supabaseClient) => {
    const { id, experiences, ...updateData } = payload;

    // Mapping frontend keys to database keys
    if ('cvData' in updateData) {
        updateData.cv_data = updateData.cvData;
        delete updateData.cvData;
    }
    if ('github' in updateData) {
        updateData.website = updateData.github;
        delete updateData.github;
    }

    const { data, error } = id
        ? await profileRepository.updateProfile(userId, updateData, supabaseClient)
        : await profileRepository.createProfile(userId, updateData, supabaseClient);

    if (error) throw new Error(error.message);

    if (experiences !== undefined) {
        await profileRepository.syncUserExperiences(userId, experiences, supabaseClient);
    }

    return data;
};

module.exports = {
    getProfile,
    upsertProfile
};