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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import {
  InventoryItem,
  IngredientInput,
  Recipe,
} from '../../types';

type SelectionMode = 'expiring' | 'manual';

export default function RecipesScreen() {
  // State for ingredient selection
  const [mode, setMode] = useState<SelectionMode>('expiring');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientInput[]>([]);
  const [loading, setLoading] = useState(true);

  // State for recipe generation
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Fetch inventory on focus
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
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
      // Silently fail, user can manually select
      console.log('Failed to get expiring items:', error.message);
    }
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
    // In manual mode, require user selection
    if (mode === 'manual' && selectedIngredients.length === 0) {
      Alert.alert('No Ingredients', 'Please select at least one ingredient');
      return;
    }

    // In expiring mode, need at least some inventory
    if (mode === 'expiring' && inventoryItems.length === 0) {
      Alert.alert('No Inventory', 'Add some items to your inventory first');
      return;
    }

    setGenerating(true);
    setRecipes([]);
    try {
      let ingredientsToSend: IngredientInput[];

      if (mode === 'expiring') {
        // Send ALL inventory items - LLM will prioritize expiring ones based on dates
        // This allows complete recipes using non-expiring items as complement
        ingredientsToSend = inventoryItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiry_date: item.expiry_date,
        }));
      } else {
        // Manual mode: only use exactly what user selected
        ingredientsToSend = selectedIngredients;
      }

      const response = await api.generateRecipes({
        ingredients: ingredientsToSend,
        max_recipes: 3,
      });
      setRecipes(response.recipes);
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
        return '#4caf50';
      case 'medium':
        return '#ff9800';
      case 'hard':
        return '#f44336';
      default:
        return '#666';
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
      <TouchableOpacity
        style={[
          styles.ingredientChip,
          selected && styles.ingredientChipSelected,
          isExpiringSoon && !selected && styles.ingredientChipExpiring,
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
            color={selected ? '#fff' : '#f57c00'}
            style={{ marginLeft: 4 }}
          />
        )}
        {selected && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#fff"
            style={{ marginLeft: 4 }}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderRecipeCard = ({ item }: { item: Recipe }) => (
    <TouchableOpacity style={styles.recipeCard} onPress={() => openRecipeDetails(item)}>
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeTitle} numberOfLines={2}>
          {item.title}
        </Text>
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
      <Text style={styles.recipeDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.recipeMetaRow}>
        <View style={styles.recipeMeta}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.recipeMetaText}>{item.cooking_time_minutes} min</Text>
        </View>
        <View style={styles.recipeMeta}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.recipeMetaText}>{item.servings} servings</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'expiring' && styles.modeButtonActive]}
          onPress={() => setMode('expiring')}
        >
          <Ionicons
            name="warning"
            size={20}
            color={mode === 'expiring' ? '#fff' : '#666'}
          />
          <Text
            style={[styles.modeButtonText, mode === 'expiring' && styles.modeButtonTextActive]}
          >
            Use Expiring
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
          onPress={() => {
            setMode('manual');
            setSelectedIngredients([]);
          }}
        >
          <Ionicons
            name="hand-left"
            size={20}
            color={mode === 'manual' ? '#fff' : '#666'}
          />
          <Text
            style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}
          >
            Pick Ingredients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode-specific content */}
      {mode === 'expiring' ? (
        /* Expiring Mode - Prioritize expiring items, use all inventory */
        <View style={styles.expiringModeSection}>
          <View style={styles.expiringModeContent}>
            <Ionicons name="flash" size={32} color="#2e7d32" />
            <Text style={styles.expiringModeTitle}>Smart Recipe Mode</Text>
            <Text style={styles.expiringModeText}>
              {selectedIngredients.length > 0
                ? `AI will prioritize your ${selectedIngredients.length} expiring item${selectedIngredients.length !== 1 ? 's' : ''} and use other ingredients to create complete recipes`
                : `AI will suggest recipes using your ${inventoryItems.length} inventory item${inventoryItems.length !== 1 ? 's' : ''}`}
            </Text>
            {selectedIngredients.length > 0 && (
              <>
                <Text style={styles.priorityLabel}>Priority items (expiring soon):</Text>
                <View style={styles.expiringItemsList}>
                  {selectedIngredients.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.expiringItemChip}>
                      <Ionicons name="warning" size={12} color="#f57c00" />
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
              <Text style={styles.noExpiringText}>
                No items expiring soon - recipes will use your full inventory
              </Text>
            )}
            {inventoryItems.length === 0 && (
              <Text style={styles.noExpiringText}>
                Add items to your inventory to get started
              </Text>
            )}
          </View>
        </View>
      ) : (
        /* Manual Mode - Show ingredient chips for selection */
        <>
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
                <Ionicons name="basket-outline" size={40} color="#ccc" />
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
      )}

      {/* Generate Button */}
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
      >
        {generating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="restaurant" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Recipes</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Recipe Results */}
      {recipes.length > 0 ? (
        <View style={styles.recipesSection}>
          <Text style={styles.sectionTitle}>Recipe Suggestions</Text>
          <FlatList
            data={recipes}
            renderItem={renderRecipeCard}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            contentContainerStyle={styles.recipesList}
          />
        </View>
      ) : generating ? (
        <View style={styles.generatingSection}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.generatingText}>Creating delicious recipes...</Text>
        </View>
      ) : (
        <View style={styles.emptyRecipes}>
          <Ionicons name="restaurant-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Select ingredients and tap Generate</Text>
        </View>
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
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedRecipe.title}
              </Text>
              <View style={{ width: 44 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalDescription}>{selectedRecipe.description}</Text>

              <View style={styles.modalMetaRow}>
                <View style={styles.modalMeta}>
                  <Ionicons name="time-outline" size={20} color="#2e7d32" />
                  <Text style={styles.modalMetaText}>
                    {selectedRecipe.cooking_time_minutes} min
                  </Text>
                </View>
                <View style={styles.modalMeta}>
                  <Ionicons name="people-outline" size={20} color="#2e7d32" />
                  <Text style={styles.modalMetaText}>{selectedRecipe.servings} servings</Text>
                </View>
                <View style={styles.modalMeta}>
                  <Ionicons name="speedometer-outline" size={20} color="#2e7d32" />
                  <Text style={styles.modalMetaText}>{selectedRecipe.difficulty}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>Ingredients</Text>
              {selectedRecipe.ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <Ionicons
                    name={ing.from_inventory ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={ing.from_inventory ? '#2e7d32' : '#999'}
                  />
                  <Text style={styles.ingredientText}>
                    {ing.quantity} {ing.name}
                  </Text>
                  {ing.from_inventory && (
                    <Text style={styles.fromInventoryBadge}>from inventory</Text>
                  )}
                </View>
              ))}

              <Text style={styles.modalSectionTitle}>Instructions</Text>
              {selectedRecipe.instructions.map((step, index) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}

              {selectedRecipe.tips && (
                <>
                  <Text style={styles.modalSectionTitle}>Tips</Text>
                  <Text style={styles.tipsText}>{selectedRecipe.tips}</Text>
                </>
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#2e7d32',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  selectedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  ingredientsSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  ingredientsList: {
    paddingHorizontal: 16,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  ingredientChipSelected: {
    backgroundColor: '#2e7d32',
  },
  ingredientChipExpiring: {
    borderWidth: 2,
    borderColor: '#f57c00',
  },
  ingredientChipText: {
    fontSize: 14,
    color: '#333',
  },
  ingredientChipTextSelected: {
    color: '#fff',
  },
  emptyIngredients: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  // Expiring mode styles
  expiringModeSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  expiringModeContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  expiringModeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  expiringModeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 13,
    color: '#f57c00',
    fontWeight: '600',
    marginBottom: 8,
  },
  expiringItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  expiringItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  expiringItemText: {
    fontSize: 13,
    color: '#e65100',
  },
  moreItemsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  noExpiringText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  recipesSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  recipesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#666',
  },
  generatingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyRecipes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 24,
  },
  modalMeta: {
    alignItems: 'center',
    gap: 4,
  },
  modalMetaText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  ingredientText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  fromInventoryBadge: {
    fontSize: 12,
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  tipsText: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    lineHeight: 22,
  },
});
