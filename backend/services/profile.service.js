const profileRepository = require('../repositories/profile.repository');

const getProfile = async () => {
    const { data, error } = await profileRepository.findFirstProfile();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    let profile = data || {};

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

const upsertProfile = async (payload) => {
    const { id, ...updateData } = payload;

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
        ? await profileRepository.updateProfile(id, updateData)
        : await profileRepository.createProfile(updateData);

    if (error) throw new Error(error.message);
    return data;
};

module.exports = {
    getProfile,
    upsertProfile
};