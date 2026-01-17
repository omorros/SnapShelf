import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { SavedRecipe, RecipeIngredient } from '../types';
import { colors, typography, spacing, radius, shadows } from '../theme';

export default function SavedRecipesScreen() {
  const router = useRouter();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSavedRecipes();
    }, [])
  );

  const fetchSavedRecipes = async () => {
    try {
      setLoading(true);
      const data = await api.getSavedRecipes();
      setSavedRecipes(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (recipe: SavedRecipe) => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${recipe.title}" from your saved recipes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unsaveRecipe(recipe.id);
              setSavedRecipes(savedRecipes.filter((r) => r.id !== recipe.id));
              if (selectedRecipe?.id === recipe.id) {
                setShowRecipeModal(false);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openRecipeDetails = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return colors.status.success;
      case 'medium':
        return colors.status.warning;
      case 'hard':
        return colors.status.error;
      default:
        return colors.text.secondary;
    }
  };

  const formatSavedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderRecipeCard = ({ item }: { item: SavedRecipe }) => (
    <Pressable
      style={({ pressed }) => [
        styles.recipeCard,
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => openRecipeDetails(item)}
    >
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <TouchableOpacity
          style={styles.unsaveButton}
          onPress={() => handleUnsave(item)}
        >
          <Ionicons name="bookmark" size={22} color={colors.primary.sage} />
        </TouchableOpacity>
      </View>
      <Text style={styles.recipeDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.recipeMetaRow}>
        <View style={styles.recipeMeta}>
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.recipeMetaText}>{item.cooking_time_minutes} min</Text>
        </View>
        <View style={styles.recipeMeta}>
          <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.recipeMetaText}>{item.servings} servings</Text>
        </View>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(item.difficulty) + '20' },
          ]}
        >
          <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
            {item.difficulty}
          </Text>
        </View>
      </View>
      <Text style={styles.savedDate}>Saved {formatSavedDate(item.saved_at)}</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.sage} />
        <Text style={styles.loadingText}>Loading saved recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Saved Recipes</Text>
          <Text style={styles.headerSubtitle}>
            {savedRecipes.length} recipe{savedRecipes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      {savedRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bookmark-outline" size={48} color={colors.primary.sageLight} />
          </View>
          <Text style={styles.emptyTitle}>No saved recipes</Text>
          <Text style={styles.emptySubtext}>
            Tap the bookmark icon on any recipe to save it here for quick access
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Recipe Detail Modal */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        onRequestClose={() => setShowRecipeModal(false)}
      >
        {selectedRecipe && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowRecipeModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedRecipe.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleUnsave(selectedRecipe)}
                style={styles.modalUnsaveButton}
              >
                <Ionicons name="bookmark" size={24} color={colors.primary.sage} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>{selectedRecipe.description}</Text>

              <View style={styles.modalMetaRow}>
                <View style={styles.modalMeta}>
                  <View style={[styles.metaIconContainer, { backgroundColor: colors.primary.sageMuted }]}>
                    <Ionicons name="time-outline" size={20} color={colors.primary.sage} />
                  </View>
                  <Text style={styles.modalMetaValue}>
                    {selectedRecipe.cooking_time_minutes}
                  </Text>
                  <Text style={styles.modalMetaLabel}>minutes</Text>
                </View>
                <View style={styles.modalMeta}>
                  <View style={[styles.metaIconContainer, { backgroundColor: colors.accent.terracottaMuted }]}>
                    <Ionicons name="people-outline" size={20} color={colors.accent.terracotta} />
                  </View>
                  <Text style={styles.modalMetaValue}>{selectedRecipe.servings}</Text>
                  <Text style={styles.modalMetaLabel}>servings</Text>
                </View>
                <View style={styles.modalMeta}>
                  <View style={[styles.metaIconContainer, { backgroundColor: getDifficultyColor(selectedRecipe.difficulty) + '20' }]}>
                    <Ionicons name="speedometer-outline" size={20} color={getDifficultyColor(selectedRecipe.difficulty)} />
                  </View>
                  <Text style={styles.modalMetaValue}>{selectedRecipe.difficulty}</Text>
                  <Text style={styles.modalMetaLabel}>difficulty</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Ingredients</Text>
                <View style={styles.ingredientsList}>
                  {selectedRecipe.ingredients.map((ing: RecipeIngredient, index: number) => (
                    <View key={index} style={styles.ingredientRow}>
                      <View style={styles.ingredientBullet} />
                      <Text style={styles.ingredientText}>
                        <Text style={styles.ingredientQuantity}>{ing.quantity}</Text> {ing.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((step: string, index: number) => (
                  <View key={index} style={styles.instructionRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{step}</Text>
                  </View>
                ))}
              </View>

              {selectedRecipe.tips && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Chef's Tips</Text>
                  <View style={styles.tipsBox}>
                    <Ionicons name="bulb" size={20} color={colors.status.warning} />
                    <Text style={styles.tipsText}>{selectedRecipe.tips}</Text>
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },

  // List
  listContainer: {
    padding: spacing.base,
  },

  // Recipe Card
  recipeCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.base,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  recipeTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  unsaveButton: {
    padding: spacing.xs,
  },
  recipeDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recipeMetaText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  difficultyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'capitalize',
  },
  savedDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalUnsaveButton: {
    padding: spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.xl,
  },
  modalMeta: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalMetaValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalMetaLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  modalSection: {
    marginBottom: spacing.xl,
  },
  modalSectionTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  ingredientsList: {
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.sage,
  },
  ingredientText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.primary,
    flex: 1,
  },
  ingredientQuantity: {
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.sage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  instructionText: {
    fontFamily: typography.fontFamily.body,
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
  tipsBox: {
    flexDirection: 'row',
    backgroundColor: colors.status.warningBg,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  tipsText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
});
