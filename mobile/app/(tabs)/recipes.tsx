import { useState, useCallback, useRef, useEffect } from 'react';
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
  Animated,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import {
  InventoryItem,
  IngredientInput,
  Recipe,
  TimePreference,
  SavedRecipe,
} from '../../types';
import { colors, typography, spacing, radius, shadows, getExpiryColor } from '../../theme';

type SelectionMode = 'expiring' | 'manual';

export default function RecipesScreen() {
  const router = useRouter();

  // State for ingredient selection
  const [mode, setMode] = useState<SelectionMode>('expiring');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientInput[]>([]);
  const [loading, setLoading] = useState(true);

  // State for recipe generation - separate storage per mode
  const [generating, setGenerating] = useState(false);
  const [expiringRecipes, setExpiringRecipes] = useState<Recipe[]>([]);
  const [manualRecipes, setManualRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Get current recipes based on mode
  const recipes = mode === 'expiring' ? expiringRecipes : manualRecipes;
  const setRecipes = mode === 'expiring' ? setExpiringRecipes : setManualRecipes;

  // Saved recipes state
  const [savedRecipeTitles, setSavedRecipeTitles] = useState<Set<string>>(new Set());

  // Preferences state
  const [showPreferences, setShowPreferences] = useState(false);
  const [timePreference, setTimePreference] = useState<TimePreference>('any');
  const [servings, setServings] = useState(2);

  // Animation
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch inventory and saved recipes on focus
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
      fetchSavedRecipes();
    }, [])
  );

  // Auto-select expiring items when mode changes to 'expiring'
  useFocusEffect(
    useCallback(() => {
      if (mode === 'expiring' && inventoryItems.length > 0) {
        selectExpiringItems();
      }
    }, [mode, inventoryItems])
  );

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventoryItems();
      setInventoryItems(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectExpiringItems = async () => {
    try {
      const expiring = await api.getExpiringIngredients(3);
      setSelectedIngredients(expiring);
    } catch (error: any) {
      console.log('Failed to get expiring items:', error.message);
    }
  };

  const fetchSavedRecipes = async () => {
    try {
      // Don't block UI - fetch in background
      const saved = await api.getSavedRecipes();
      const titles = new Set(saved.map((r) => r.title));
      setSavedRecipeTitles(titles);
    } catch (error: any) {
      // Silently fail - saved status is not critical
      console.log('Failed to fetch saved recipes:', error.message);
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    try {
      await api.saveRecipe(recipe);
      setSavedRecipeTitles((prev) => new Set([...prev, recipe.title]));
      Alert.alert('Saved!', 'Recipe added to your favorites');
    } catch (error: any) {
      if (error.message.includes('already saved')) {
        Alert.alert('Already Saved', 'This recipe is already in your favorites');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleUnsaveRecipe = async (recipe: Recipe) => {
    try {
      // Find the saved recipe by title to get its ID
      const saved = await api.getSavedRecipes();
      const savedRecipe = saved.find((r) => r.title === recipe.title);
      if (savedRecipe) {
        await api.unsaveRecipe(savedRecipe.id);
        setSavedRecipeTitles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(recipe.title);
          return newSet;
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const isRecipeSaved = (recipe: Recipe) => {
    return savedRecipeTitles.has(recipe.title);
  };

  const toggleIngredient = (item: InventoryItem) => {
    const exists = selectedIngredients.find((i) => i.name === item.name);
    if (exists) {
      setSelectedIngredients(selectedIngredients.filter((i) => i.name !== item.name));
    } else {
      setSelectedIngredients([
        ...selectedIngredients,
        {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiry_date: item.expiry_date,
        },
      ]);
    }
  };

  const isSelected = (item: InventoryItem) => {
    return selectedIngredients.some((i) => i.name === item.name);
  };

  const handleGenerateRecipes = async () => {
    if (mode === 'manual' && selectedIngredients.length === 0) {
      Alert.alert('No Ingredients', 'Please select at least one ingredient');
      return;
    }

    if (mode === 'expiring' && inventoryItems.length === 0) {
      Alert.alert('No Inventory', 'Add some items to your inventory first');
      return;
    }

    // Capture current mode to ensure correct state update
    const currentMode = mode;
    const currentSetRecipes = currentMode === 'expiring' ? setExpiringRecipes : setManualRecipes;

    setGenerating(true);
    currentSetRecipes([]);
    try {
      // For manual mode, only send selected ingredients
      // For auto mode, send all inventory items
      const ingredientsToSend: IngredientInput[] = currentMode === 'manual'
        ? selectedIngredients
        : inventoryItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            expiry_date: item.expiry_date,
          }));

      // For manual mode, also pass the selected ingredient names
      const selectedNames = currentMode === 'manual'
        ? selectedIngredients.map((i) => i.name)
        : undefined;

      const response = await api.generateRecipes({
        ingredients: ingredientsToSend,
        max_recipes: 3,
        mode: currentMode === 'expiring' ? 'auto' : 'manual',
        selected_ingredient_names: selectedNames,
        time_preference: timePreference,
        servings: servings,
      });
      currentSetRecipes(response.recipes);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setGenerating(false);
    }
  };

  const openRecipeDetails = (recipe: Recipe) => {
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

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderIngredientChip = ({ item }: { item: InventoryItem }) => {
    const selected = isSelected(item);
    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry >= 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.ingredientChip,
          selected && styles.ingredientChipSelected,
          isExpiringSoon && !selected && styles.ingredientChipExpiring,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => toggleIngredient(item)}
      >
        <Text
          style={[
            styles.ingredientChipText,
            selected && styles.ingredientChipTextSelected,
          ]}
        >
          {item.name}
        </Text>
        {isExpiringSoon && (
          <Ionicons
            name="warning"
            size={14}
            color={selected ? colors.text.inverse : colors.status.warning}
            style={{ marginLeft: 4 }}
          />
        )}
        {selected && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={colors.text.inverse}
            style={{ marginLeft: 4 }}
          />
        )}
      </Pressable>
    );
  };

  const renderRecipeCard = ({ item, index }: { item: Recipe; index: number }) => {
    const saved = isRecipeSaved(item);
    return (
      <Animated.View
        style={[
          styles.recipeCard,
          {
            opacity: headerOpacity,
            transform: [{
              translateY: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.recipeCardInner,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => openRecipeDetails(item)}
        >
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.recipeHeaderRight}>
              <TouchableOpacity
                style={styles.bookmarkButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (saved) {
                    handleUnsaveRecipe(item);
                  } else {
                    handleSaveRecipe(item);
                  }
                }}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={saved ? colors.primary.sage : colors.text.secondary}
                />
              </TouchableOpacity>
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
          </View>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.recommendation_reason && (
          <View style={styles.recommendationReasonBox}>
            <Ionicons name="leaf" size={14} color={colors.primary.sage} />
            <Text style={styles.recommendationReasonText} numberOfLines={1}>
              {item.recommendation_reason}
            </Text>
          </View>
        )}
        <View style={styles.recipeMetaRow}>
          <View style={styles.recipeMeta}>
            <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.recipeMetaText}>{item.cooking_time_minutes} min</Text>
          </View>
          <View style={styles.recipeMeta}>
            <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.recipeMetaText}>{item.servings} servings</Text>
          </View>
          <View style={styles.recipeMeta}>
            <Ionicons name="restaurant-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.recipeMetaText}>{item.ingredients.length} items</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.sage} />
        <Text style={styles.loadingText}>Loading your ingredients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>AI-Powered</Text>
            <Text style={styles.headerTitle}>Recipe Ideas</Text>
          </View>
          <TouchableOpacity
            style={styles.savedButton}
            onPress={() => router.push('/saved-recipes')}
          >
            <Ionicons name="bookmark" size={20} color={colors.primary.sage} />
            <Text style={styles.savedButtonText}>Saved</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.modeButton,
            mode === 'expiring' && styles.modeButtonActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            setMode('expiring');
          }}
        >
          <Ionicons
            name="flash"
            size={18}
            color={mode === 'expiring' ? colors.text.inverse : colors.text.secondary}
          />
          <Text
            style={[styles.modeButtonText, mode === 'expiring' && styles.modeButtonTextActive]}
          >
            Smart Mode
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.modeButton,
            mode === 'manual' && styles.modeButtonActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => {
            setMode('manual');
            setSelectedIngredients([]);
          }}
        >
          <Ionicons
            name="hand-left"
            size={18}
            color={mode === 'manual' ? colors.text.inverse : colors.text.secondary}
          />
          <Text
            style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}
          >
            Pick Items
          </Text>
        </Pressable>
      </View>

      {/* Preferences Section (Collapsible) */}
      <View style={styles.preferencesContainer}>
        <Pressable
          style={styles.preferencesHeader}
          onPress={() => setShowPreferences(!showPreferences)}
        >
          <View style={styles.preferencesHeaderLeft}>
            <Ionicons name="options-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.preferencesHeaderText}>Preferences</Text>
            {(timePreference !== 'any' || servings !== 2) && (
              <View style={styles.preferencesActiveBadge}>
                <Text style={styles.preferencesActiveBadgeText}>Modified</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={showPreferences ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>

        {showPreferences && (
          <View style={styles.preferencesContent}>
            {/* Time Preference */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>Cooking Time</Text>
              <View style={styles.preferenceChips}>
                {(['quick', 'normal', 'any'] as TimePreference[]).map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.preferenceChip,
                      timePreference === option && styles.preferenceChipActive,
                    ]}
                    onPress={() => setTimePreference(option)}
                  >
                    <Text
                      style={[
                        styles.preferenceChipText,
                        timePreference === option && styles.preferenceChipTextActive,
                      ]}
                    >
                      {option === 'quick' ? '< 30 min' : option === 'normal' ? '30-60 min' : 'Any'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Servings */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>Servings</Text>
              <View style={styles.servingsControl}>
                <Pressable
                  style={styles.servingsButton}
                  onPress={() => setServings(Math.max(1, servings - 1))}
                >
                  <Ionicons name="remove" size={20} color={colors.primary.sage} />
                </Pressable>
                <Text style={styles.servingsValue}>{servings}</Text>
                <Pressable
                  style={styles.servingsButton}
                  onPress={() => setServings(Math.min(6, servings + 1))}
                >
                  <Ionicons name="add" size={20} color={colors.primary.sage} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Mode-specific content */}
      {mode === 'expiring' && expiringRecipes.length === 0 && !generating ? (
        <View style={styles.smartModeSection}>
          <View style={styles.smartModeContent}>
            <View style={styles.smartModeIcon}>
              <Ionicons name="sparkles" size={28} color={colors.primary.sage} />
            </View>
            <Text style={styles.smartModeTitle}>Smart Recipe Mode</Text>
            <Text style={styles.smartModeText}>
              {selectedIngredients.length > 0
                ? `AI will prioritize your ${selectedIngredients.length} expiring item${selectedIngredients.length !== 1 ? 's' : ''} and use other ingredients to create complete recipes`
                : `AI will suggest recipes using your ${inventoryItems.length} inventory item${inventoryItems.length !== 1 ? 's' : ''}`}
            </Text>
            {selectedIngredients.length > 0 && (
              <>
                <Text style={styles.priorityLabel}>Priority items (expiring soon)</Text>
                <View style={styles.expiringItemsList}>
                  {selectedIngredients.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.expiringItemChip}>
                      <Ionicons name="warning" size={12} color={colors.status.warning} />
                      <Text style={styles.expiringItemText}>{item.name}</Text>
                    </View>
                  ))}
                  {selectedIngredients.length > 5 && (
                    <Text style={styles.moreItemsText}>
                      +{selectedIngredients.length - 5} more
                    </Text>
                  )}
                </View>
              </>
            )}
            {selectedIngredients.length === 0 && inventoryItems.length > 0 && (
              <View style={styles.noExpiringBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                <Text style={styles.noExpiringText}>
                  No items expiring soon - recipes will use your full inventory
                </Text>
              </View>
            )}
            {inventoryItems.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="basket-outline" size={18} color={colors.text.muted} />
                <Text style={styles.emptyBoxText}>
                  Add items to your inventory to get started
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : mode === 'manual' ? (
        <>
          {/* Always show ingredient selection in manual mode */}
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedCount}>
              {selectedIngredients.length} ingredient
              {selectedIngredients.length !== 1 ? 's' : ''} selected
            </Text>
            {selectedIngredients.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedIngredients([])}>
                <Text style={styles.clearButton}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.ingredientsSection}>
            <Text style={styles.sectionTitle}>Your Inventory</Text>
            {inventoryItems.length === 0 ? (
              <View style={styles.emptyIngredients}>
                <Ionicons name="basket-outline" size={40} color={colors.text.muted} />
                <Text style={styles.emptyText}>No items in inventory</Text>
                <Text style={styles.emptySubtext}>Add some food items first</Text>
              </View>
            ) : (
              <FlatList
                data={inventoryItems}
                renderItem={renderIngredientChip}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ingredientsList}
              />
            )}
          </View>
        </>
      ) : null}

      {/* Generate Button */}
      <View style={styles.generateButtonContainer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            ((mode === 'manual' && selectedIngredients.length === 0) ||
              (mode === 'expiring' && inventoryItems.length === 0) ||
              generating) &&
              styles.generateButtonDisabled,
          ]}
          onPress={handleGenerateRecipes}
          disabled={
            (mode === 'manual' && selectedIngredients.length === 0) ||
            (mode === 'expiring' && inventoryItems.length === 0) ||
            generating
          }
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name={recipes.length > 0 ? 'refresh' : 'sparkles'} size={20} color={colors.text.inverse} />
              <Text style={styles.generateButtonText}>
                {recipes.length > 0 ? 'Regenerate Recipes' : 'Generate Recipes'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recipe Results */}
      {recipes.length > 0 ? (
        <View style={styles.recipesSection}>
          <Text style={styles.sectionTitle}>Recipe Suggestions</Text>
          <FlatList
            data={recipes}
            renderItem={renderRecipeCard}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            contentContainerStyle={styles.recipesList}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </View>
      ) : generating ? (
        <View style={styles.generatingSection}>
          <ActivityIndicator size="large" color={colors.primary.sage} />
          <Text style={styles.generatingText}>Creating delicious recipes...</Text>
        </View>
      ) : mode === 'expiring' ? (
        <View style={styles.emptyRecipes}>
          <View style={styles.emptyRecipesIcon}>
            <Ionicons name="restaurant-outline" size={48} color={colors.primary.sageLight} />
          </View>
          <Text style={styles.emptyRecipesTitle}>No recipes yet</Text>
          <Text style={styles.emptyRecipesSubtext}>
            Tap Generate to get AI-powered recipe suggestions based on your inventory
          </Text>
        </View>
      ) : null}

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
                style={styles.modalBookmarkButton}
                onPress={() => {
                  if (isRecipeSaved(selectedRecipe)) {
                    handleUnsaveRecipe(selectedRecipe);
                  } else {
                    handleSaveRecipe(selectedRecipe);
                  }
                }}
              >
                <Ionicons
                  name={isRecipeSaved(selectedRecipe) ? 'bookmark' : 'bookmark-outline'}
                  size={26}
                  color={isRecipeSaved(selectedRecipe) ? colors.primary.sage : colors.text.secondary}
                />
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
                <View style={styles.ingredientsList2}>
                  {selectedRecipe.ingredients.map((ing, index) => (
                    <View key={index} style={styles.ingredientRow}>
                      <View style={[
                        styles.ingredientCheckbox,
                        ing.from_inventory && styles.ingredientCheckboxActive,
                        ing.is_expiring_soon && styles.ingredientCheckboxExpiring
                      ]}>
                        <Ionicons
                          name={ing.is_expiring_soon ? 'warning' : ing.from_inventory ? 'checkmark' : 'add'}
                          size={14}
                          color={ing.is_expiring_soon ? colors.text.inverse : ing.from_inventory ? colors.text.inverse : colors.text.muted}
                        />
                      </View>
                      <Text style={styles.ingredientText}>
                        <Text style={styles.ingredientQuantity}>{ing.quantity}</Text> {ing.name}
                      </Text>
                      {ing.is_expiring_soon && ing.days_until_expiry !== null && ing.days_until_expiry !== undefined && (
                        <View style={styles.expiringBadge}>
                          <Text style={styles.expiringBadgeText}>
                            {ing.days_until_expiry === 0 ? 'today' : ing.days_until_expiry === 1 ? '1 day' : `${ing.days_until_expiry} days`}
                          </Text>
                        </View>
                      )}
                      {ing.from_inventory && !ing.is_expiring_soon && (
                        <View style={styles.fromInventoryBadge}>
                          <Text style={styles.fromInventoryText}>in pantry</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((step, index) => (
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
  },
  loadingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
  },
  headerLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary.sage,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.sageMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  savedButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary.sage,
  },

  // Mode Toggle
  modeToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.background.secondary,
    gap: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primary.sage,
  },
  modeButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modeButtonTextActive: {
    color: colors.text.inverse,
  },

  // Preferences Section
  preferencesContainer: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: radius.base,
    ...shadows.sm,
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  preferencesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preferencesHeaderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  preferencesActiveBadge: {
    backgroundColor: colors.primary.sageMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  preferencesActiveBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.primary.sage,
    fontWeight: typography.weight.medium,
  },
  preferencesContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  preferenceChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preferenceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
  },
  preferenceChipActive: {
    backgroundColor: colors.primary.sage,
  },
  preferenceChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  preferenceChipTextActive: {
    color: colors.text.inverse,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  servingsButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },

  // Smart Mode Section
  smartModeSection: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.base,
  },
  smartModeContent: {
    alignItems: 'center',
  },
  smartModeIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  smartModeTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  smartModeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.md,
  },
  priorityLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.status.warning,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  expiringItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  expiringItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
  },
  expiringItemText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.status.warning,
    fontWeight: typography.weight.medium,
  },
  moreItemsText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  noExpiringBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    gap: spacing.sm,
  },
  noExpiringText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.status.success,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    gap: spacing.sm,
  },
  emptyBoxText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },

  // Manual Selection
  selectedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  selectedCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  clearButton: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.primary.sage,
    fontWeight: typography.weight.semibold,
  },
  ingredientsSection: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  ingredientsList: {
    paddingHorizontal: spacing.base,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
  },
  ingredientChipSelected: {
    backgroundColor: colors.primary.sage,
  },
  ingredientChipExpiring: {
    borderWidth: 1.5,
    borderColor: colors.status.warning,
  },
  ingredientChipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  ingredientChipTextSelected: {
    color: colors.text.inverse,
  },
  emptyIngredients: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },

  // Generate Button
  generateButtonContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.sage,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  generateButtonDisabled: {
    backgroundColor: colors.text.muted,
  },
  generateButtonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  // Recipe Results
  recipesSection: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  recipesList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
  },
  recipeCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    ...shadows.base,
  },
  recipeCardInner: {
    padding: spacing.base,
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
  recipeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bookmarkButton: {
    padding: spacing.xs,
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
  recipeDescription: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  recommendationReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.sageMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  recommendationReasonText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.primary.sageDark,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
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
  generatingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyRecipes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyRecipesIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary.sageMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyRecipesTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyRecipesSubtext: {
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
  modalBookmarkButton: {
    padding: spacing.xs,
    width: 44,
    alignItems: 'center',
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
  ingredientsList2: {
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ingredientCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientCheckboxActive: {
    backgroundColor: colors.primary.sage,
  },
  ingredientCheckboxExpiring: {
    backgroundColor: colors.status.warning,
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
  fromInventoryBadge: {
    backgroundColor: colors.primary.sageMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: radius.sm,
  },
  fromInventoryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.primary.sage,
    fontWeight: typography.weight.medium,
  },
  expiringBadge: {
    backgroundColor: colors.status.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: radius.sm,
  },
  expiringBadgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.status.warning,
    fontWeight: typography.weight.semibold,
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
