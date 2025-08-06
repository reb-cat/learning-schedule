/**
 * Intelligent duplicate detection utilities for administrative tasks
 */

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calculate similarity percentage between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const normalizedStr1 = str1.toLowerCase().trim();
  const normalizedStr2 = str2.toLowerCase().trim();
  
  if (normalizedStr1 === normalizedStr2) return 100;
  
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLength === 0) return 100;
  
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  return ((maxLength - distance) / maxLength) * 100;
}

// Normalize notification types to standard forms
export function normalizeNotificationType(type: string): string {
  const normalizedType = type.toLowerCase().trim();
  
  // Map variations to standard types
  const typeMap: Record<string, string> = {
    'fee': 'fee',
    'fees': 'fee',
    'course_fee': 'fee',
    'payment': 'fee',
    'form': 'form',
    'forms': 'form',
    'permission': 'permission',
    'delivery': 'delivery',
    'bring': 'delivery',
    'submit': 'form',
    'checklist_item': 'checklist_item',
    'general': 'general'
  };
  
  return typeMap[normalizedType] || normalizedType;
}

// Extract key terms from title for semantic comparison
function extractKeyTerms(title: string): string[] {
  const normalized = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
    
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'copy', 'please']);
  
  return normalized.split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
    .sort();
}

// Check semantic similarity using key terms
function checkSemanticSimilarity(title1: string, title2: string): number {
  const terms1 = new Set(extractKeyTerms(title1));
  const terms2 = new Set(extractKeyTerms(title2));
  
  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);
  
  if (union.size === 0) return 0;
  
  // Jaccard similarity coefficient
  return (intersection.size / union.size) * 100;
}

// Check if two administrative notifications are duplicates
export interface DuplicateCheckParams {
  title: string;
  notificationType: string;
  courseName?: string;
  studentName: string;
  amount?: number;
}

export function isDuplicateNotification(
  newNotification: DuplicateCheckParams,
  existing: DuplicateCheckParams,
  threshold: number = 80
): boolean {
  // Must be same student
  if (newNotification.studentName !== existing.studentName) {
    return false;
  }
  
  // Normalize notification types
  const newType = normalizeNotificationType(newNotification.notificationType);
  const existingType = normalizeNotificationType(existing.notificationType);
  
  // Different normalized types = not duplicate (unless both are fees)
  if (newType !== existingType && !(newType === 'fee' && existingType === 'fee')) {
    return false;
  }
  
  // ENHANCED: For fee types, check for exact match on student + course + amount
  if (newType === 'fee' && existingType === 'fee') {
    const hasSameAmount = newNotification.amount && existing.amount && 
                         Math.abs(newNotification.amount - existing.amount) < 0.01;
    const hasSameCourse = newNotification.courseName && existing.courseName && 
                         newNotification.courseName === existing.courseName;
    
    // If same student + same course + same amount = definitely duplicate
    if (hasSameAmount && hasSameCourse) {
      console.log(`🚨 EXACT DUPLICATE DETECTED: Same student (${newNotification.studentName}), same course (${newNotification.courseName}), same amount ($${newNotification.amount})`);
      return true;
    }
  }
  
  // Check course similarity (if both have courses)
  let courseSimilarity = 100;
  if (newNotification.courseName && existing.courseName) {
    courseSimilarity = calculateSimilarity(newNotification.courseName, existing.courseName);
    // If courses are very different, likely not a duplicate
    if (courseSimilarity < 60) {
      return false;
    }
  }
  
  // Calculate title similarity using both string similarity and semantic similarity
  const stringSimilarity = calculateSimilarity(newNotification.title, existing.title);
  const semanticSimilarity = checkSemanticSimilarity(newNotification.title, existing.title);
  
  // Use the higher of the two similarity scores
  const titleSimilarity = Math.max(stringSimilarity, semanticSimilarity);
  
  console.log(`🔍 Duplicate check: "${newNotification.title}" vs "${existing.title}"`);
  console.log(`   String similarity: ${stringSimilarity.toFixed(1)}%`);
  console.log(`   Semantic similarity: ${semanticSimilarity.toFixed(1)}%`);
  console.log(`   Course similarity: ${courseSimilarity.toFixed(1)}%`);
  console.log(`   Overall score: ${titleSimilarity.toFixed(1)}%`);
  
  // For fee types, also check amount similarity
  if (newType === 'fee' && newNotification.amount && existing.amount) {
    const amountDiff = Math.abs(newNotification.amount - existing.amount);
    const avgAmount = (newNotification.amount + existing.amount) / 2;
    const amountSimilarity = amountDiff / avgAmount * 100;
    
    // If amounts are very different (>20% difference), lower the threshold
    if (amountSimilarity > 20) {
      threshold += 10; // Make it harder to be considered duplicate
    }
  }
  
  return titleSimilarity >= threshold;
}

// Find potential duplicates in a list of notifications
export async function findPotentialDuplicates(
  supabase: any,
  newNotification: DuplicateCheckParams,
  threshold: number = 80
): Promise<any[]> {
  console.log(`🔍 Checking for duplicates of: "${newNotification.title}"`);
  
  // Get existing notifications for the same student and normalized type
  const normalizedType = normalizeNotificationType(newNotification.notificationType);
  
  const { data: existingNotifications, error } = await supabase
    .from('administrative_notifications')
    .select('*')
    .eq('student_name', newNotification.studentName);
    
  if (error) {
    console.error('❌ Error fetching existing notifications:', error);
    return [];
  }
  
  if (!existingNotifications || existingNotifications.length === 0) {
    console.log('ℹ️ No existing notifications found');
    return [];
  }
  
  // Check each existing notification for similarity
  const duplicates = [];
  for (const existing of existingNotifications) {
    const existingParams: DuplicateCheckParams = {
      title: existing.title,
      notificationType: existing.notification_type,
      courseName: existing.course_name,
      studentName: existing.student_name,
      amount: existing.amount
    };
    
    if (isDuplicateNotification(newNotification, existingParams, threshold)) {
      duplicates.push(existing);
      console.log(`🔄 Found potential duplicate: "${existing.title}"`);
    }
  }
  
  console.log(`📊 Found ${duplicates.length} potential duplicates`);
  return duplicates;
}