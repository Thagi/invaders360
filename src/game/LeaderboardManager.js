import { supabase } from '../utils/supabaseClient.js';

export class LeaderboardManager {
    constructor() {
        this.isEnabled = !!supabase;
        console.log('LeaderboardManager initialized. Enabled:', this.isEnabled);
    }

    async fetchTopScores(mode, limit = 10) {
        if (!this.isEnabled) return [];

        console.log(`Fetching top scores for mode: ${mode}`);
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('player_name, score, created_at')
                .eq('mode', mode)
                .order('score', { ascending: false })
                .limit(limit);

            if (error) throw error;
            console.log('Top scores fetched:', data);
            return data;
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    }

    async submitScore(playerName, score, mode) {
        if (!this.isEnabled) return null;

        console.log(`Submitting score: ${score} for ${playerName} in ${mode}`);
        try {
            const { data, error } = await supabase
                .from('scores')
                .insert([
                    { player_name: playerName, score: score, mode: mode }
                ])
                .select();

            if (error) throw error;
            console.log('Score submitted successfully:', data);
            return data;
        } catch (error) {
            console.error('Error submitting score:', error);
            return null;
        }
    }

    async getRank(score, mode) {
        if (!this.isEnabled) return null;

        console.log(`Calculating rank for score: ${score} in ${mode}`);
        try {
            // Count how many scores are strictly greater than the current score
            const { count, error } = await supabase
                .from('scores')
                .select('*', { count: 'exact', head: true })
                .eq('mode', mode)
                .gt('score', score);

            if (error) throw error;

            // Rank is count + 1
            const rank = count + 1;
            console.log(`Calculated rank: ${rank}`);
            return rank;
        } catch (error) {
            console.error('Error calculating rank:', error);
            return null;
        }
    }
}
