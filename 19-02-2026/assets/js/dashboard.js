/**
 * ShardaHub Master Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Wait for Auth
    if (window.SubpassAuth && window.SubpassAuth.ready) {
        await window.SubpassAuth.ready;
    }

    const user = SubpassAuth.user;
    if (!user) {
        console.warn("Master Hub: No user detected. Redirecting to landing.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Bind Basic User Info
    document.getElementById('user-greeting').innerText = user.full_name || 'Sharda User';
    document.getElementById('stat-role').innerText = user.role || 'Registered';

    // 3. Fetch Aggregate Data
    try {
        // AI Credits from User Profiles
        const profile = await ShardaDB.getProfile(user.id);
        if (profile) {
            document.getElementById('stat-ai-credits').innerText = profile.ai_credits || 0;
        }

        // Enrollment Count
        const enrollments = await ShardaDB.getEnrollments(user.id);
        document.getElementById('stat-courses').innerText = enrollments.length || 0;

    } catch (err) {
        console.error("Master Hub: Failed to load aggregate stats", err);
    }
});
