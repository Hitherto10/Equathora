import { supabase } from './supabaseClient';
import { getInProgressProblems } from '../lib/progressStorage';
import { generateProblemSlug, extractIdFromSlug } from './slugify';

/**
 * Service for managing problems from Supabase database
 * Replaces local problems.js file
 */

// ============================================================================
// PROBLEM GROUPS
// ============================================================================

/**
 * Get all active problem groups
 */
export async function getProblemGroups() {
    try {
        const { data, error } = await supabase
            .from('problem_groups')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching problem groups:', error);
        return [];
    }
}

/**
 * Get a single problem group by ID
 */
export async function getProblemGroup(groupId) {
    try {
        const { data, error } = await supabase
            .from('problem_groups')
            .select('*')
            .eq('id', groupId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching problem group:', error);
        return null;
    }
}

// ============================================================================
// PROBLEMS
// ============================================================================ 
export async function getProblems(
    page = null,
    pageSize = null,
    problemId = null,
    slug = null,
    difficulties = null,
    topics = null,
    grades = null,
    searchTerm = null,
    sort = null,
    progress = null,
    status = null
) {
    const buildCsv = (value) => Array.isArray(value) && value.length > 0 ? value.join(',') : null;

    try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const params = new URLSearchParams();

        params.set('page', String(page ?? 1));
        params.set('pageSize', String(pageSize ?? 50));

        if (searchTerm) params.set('q', searchTerm);
        if (sort) params.set('sort', sort);

        const difficultyCsv = buildCsv(difficulties);
        const topicCsv = buildCsv(topics);
        const gradeCsv = buildCsv(grades);
        const statusCsv = buildCsv(status);
        const progressCsv = buildCsv(progress);

        if (difficultyCsv) params.set('difficulty', difficultyCsv);
        if (topicCsv) params.set('topic', topicCsv);
        if (gradeCsv) params.set('grade', gradeCsv);
        if (statusCsv) params.set('status', statusCsv);
        if (progressCsv) params.set('progress', progressCsv);

        if (problemId) params.set('problemId', String(problemId));
        if (slug) params.set('slug', slug);

        const backendResponse = await fetch(`${apiBase}/api/problems?${params.toString()}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!backendResponse.ok) {
            throw new Error(`Backend problems endpoint failed with ${backendResponse.status}`);
        }

        const backendData = await backendResponse.json();
        return {
            data: backendData?.data || [],
            count: backendData?.count || 0,
            page: backendData?.page ?? page,
            pageSize: backendData?.pageSize ?? pageSize,
            facets: backendData?.facets || {
                difficulty: {},
                topic: {},
                grade: {},
                progress: {},
            },
        };
    } catch (backendError) {
        console.warn("getProblems backend fetch failed, falling back to Supabase RPC:", backendError);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            let completed = null;

            if (status && status.includes('completed')) {
                completed = true;
            } else if (status && status.includes('notstarted') || progress && progress.includes('in-progress')) {
                completed = false;
            }

            const { data, error } = await supabase.rpc("get_problems_with_facets", {
                p_user_id: session?.user?.id,
                p_page: page,
                p_page_size: pageSize,
                p_problem_id: problemId,
                p_slug: slug,
                p_difficulties: difficulties,
                p_topics: topics,
                p_grades: grades,
                p_search_term: searchTerm,
                p_sort: sort,
                p_progress: progress,
                p_completed: completed,
            });

            if (error) throw error;
            return {
                data: data?.data || [],
                count: data?.count || 0,
                page: data?.page ?? page,
                pageSize: data?.pageSize ?? pageSize,
                facets: data?.facets || {
                    difficulty: {},
                    topic: {},
                    grade: {},
                    progress: {},
                },
            };
        } catch (err) {
            console.error("getProblems error:", err);
            return {
                data: [],
                count: 0,
                page,
                pageSize,
                facets: {
                    difficulty: {},
                    topic: {},
                    grade: {},
                    progress: {},
                },
            };
        }
    }
}


/**
 * Get all active problems
 */
export async function getAllProblems() {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('is_active', true)
            .order('group_id', { ascending: true })
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching problems:', error);
        return [];
    }
}

/**
 * Get problems by group ID
 */
export async function getProblemsByGroup(groupId) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('group_id', groupId)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching problems by group:', error);
        return [];
    }
}

/**
 * Get a single problem by ID
 */
export async function getProblem(problemId) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('id', problemId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching problem:', error);
        return null;
    }
}

/**
 * Get a single problem by slug
 * Falls back to ID extraction if direct slug lookup fails
 */
export async function getProblemBySlug(slug) {
    try {
        // First try direct slug lookup
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (!error && data) return data;

        // Fallback: extract ID from slug and lookup by ID
        const extractedId = extractIdFromSlug(slug);
        if (extractedId) {
            return await getProblem(extractedId);
        }

        return null;
    } catch (error) {
        // Try fallback extraction
        const extractedId = extractIdFromSlug(slug);
        if (extractedId) {
            return await getProblem(extractedId);
        }
        console.error('Error fetching problem by slug:', error);
        return null;
    }
}

/**
 * Get problems by difficulty
 */
export async function getProblemsByDifficulty(difficulty) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('difficulty', difficulty)
            .eq('is_active', true)
            .order('group_id', { ascending: true })
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching problems by difficulty:', error);
        return [];
    }
}

/**
 * Get problems by topic
 */
export async function getProblemsByTopic(topic) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .eq('topic', topic)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching problems by topic:', error);
        return [];
    }
}

/**
 * Search problems by title or description
 */
export async function searchProblems(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .select('*')
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            .eq('is_active', true)
            .order('group_id', { ascending: true })
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching problems:', error);
        return [];
    }
}

/**
 * Get problem count by group
 */
export async function getProblemCountByGroup(groupId) {
    try {
        const { count, error } = await supabase
            .from('problems')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('is_active', true);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error counting problems:', error);
        return 0;
    }
}

// ============================================================================
// ADMIN FUNCTIONS (for adding/editing problems)
// ============================================================================

/**
 * Add a new problem (requires authentication)
 */
export async function addProblem(problemData) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .insert([problemData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding problem:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing problem (requires authentication)
 */
export async function updateProblem(problemId, updates) {
    try {
        const { data, error } = await supabase
            .from('problems')
            .update(updates)
            .eq('id', problemId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating problem:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a problem (soft delete - sets is_active to false)
 */
export async function deleteProblem(problemId) {
    try {
        const { error } = await supabase
            .from('problems')
            .update({ is_active: false })
            .eq('id', problemId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting problem:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a new problem group (requires authentication)
 */
export async function addProblemGroup(groupData) {
    try {
        const { data, error } = await supabase
            .from('problem_groups')
            .insert([groupData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding problem group:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a problem group (requires authentication)
 */
export async function updateProblemGroup(groupId, updates) {
    try {
        const { data, error } = await supabase
            .from('problem_groups')
            .update(updates)
            .eq('id', groupId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating problem group:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all problems formatted like the old problems.js structure
 * (for backwards compatibility during migration)
 */
export async function getProblemsLegacyFormat() {
    try {
        const [groups, problems] = await Promise.all([
            getProblemGroups(),
            getAllProblems()
        ]);

        return {
            problemGroups: groups.map(g => ({
                id: g.id,
                name: g.name,
                description: g.description
            })),
            problems: problems.map(p => ({
                id: p.id,
                groupId: p.group_id,
                title: p.title,
                difficulty: p.difficulty,
                description: p.description,
                answer: p.answer,
                acceptedAnswers: p.accepted_answers,
                hints: p.hints,
                solution: p.solution,
                premium: p.is_premium,
                topic: p.topic
            }))
        };
    } catch (error) {
        console.error('Error fetching legacy format:', error);
        return { problemGroups: [], problems: [] };
    }
}
