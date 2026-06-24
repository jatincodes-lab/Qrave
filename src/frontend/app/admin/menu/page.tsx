"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChefHat, ChevronLeft, ChevronRight, IndianRupee, Layers3, Loader2, Pencil, Plus, Power, RotateCcw, Save, Search } from "lucide-react";
import { AdminShell } from "../../../components/admin-shell";
import { EmptyBranchState, MetricCard, PageError, PageLoading } from "../../../components/admin-page-common";
import { MenuItemImagePicker } from "../../../components/menu-item-image-picker";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import {
  createMenuCategory,
  createMenuItem,
  deactivateMenuCategory,
  deactivateMenuItem,
  getMenuCategories,
  getMenuItems,
  updateMenuCategory,
  updateMenuItem,
  type DietTypeCode,
  type MenuCategory,
  type MenuItem
} from "../../../lib/api";
import { formatMoney, useAdminWorkspace } from "../../../lib/admin-workspace";
import { firstInvalid, validateMoney, validateOptionalText, validatePositiveInteger, validateRequired } from "../../../lib/validation";

type ItemForm = {
  menuCategoryId: string;
  name: string;
  description: string;
  dietTypeCode: DietTypeCode;
  imageUrl: string;
  imageAltText: string;
  price: string;
  displayOrder: string;
  isAvailable: boolean;
  variants: ItemVariantForm[];
};

type ItemVariantForm = {
  menuItemVariantId: string | null;
  name: string;
  price: string;
  displayOrder: string;
  isAvailable: boolean;
};

type CategoryForm = {
  name: string;
  displayOrder: string;
};

type ItemStatusFilter = "all" | "available" | "hidden";
type ItemDietFilter = "all" | DietTypeCode;

const EmptyItemForm: ItemForm = {
  menuCategoryId: "",
  name: "",
  description: "",
  dietTypeCode: "Unspecified",
  imageUrl: "",
  imageAltText: "",
  price: "",
  displayOrder: "1",
  isAvailable: true,
  variants: []
};

const EmptyCategoryForm: CategoryForm = {
  name: "",
  displayOrder: "1"
};

const AllCategoryId = "all";
const MenuPageSizeOptions = [10, 25, 50];
const CategoryAccentColors = ["#534AB7", "#0F6E56", "#854F0B", "#185FA5", "#993C1D", "#7C3AED", "#0E7490", "#B45309"];

const DietTypeOptions: { value: DietTypeCode; label: string }[] = [
  { value: "Unspecified", label: "Unspecified" },
  { value: "Veg", label: "Veg" },
  { value: "NonVeg", label: "Non-veg" },
  { value: "Vegan", label: "Vegan" },
  { value: "Egg", label: "Egg" },
  { value: "Jain", label: "Jain" }
];

export default function AdminMenuPage() {
  const workspace = useAdminWorkspace();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [itemForm, setItemForm] = useState<ItemForm>(EmptyItemForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryForm, setEditingCategoryForm] = useState<CategoryForm>(EmptyCategoryForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<ItemForm>(EmptyItemForm);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(AllCategoryId);
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState<ItemStatusFilter>("all");
  const [itemDietFilter, setItemDietFilter] = useState<ItemDietFilter>("all");
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(10);

  const sortedAllCategories = useMemo(() => [...categories].sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name)), [categories]);
  const sortedCategories = useMemo(() => sortedAllCategories.filter((category) => category.isActive), [sortedAllCategories]);
  const inactiveCategories = useMemo(() => sortedAllCategories.filter((category) => !category.isActive), [sortedAllCategories]);
  const activeCategoryIds = useMemo(() => new Set(sortedCategories.map((category) => category.menuCategoryId)), [sortedCategories]);
  const activeMenuItems = useMemo(() => items.filter((item) => activeCategoryIds.has(item.menuCategoryId)), [activeCategoryIds, items]);
  const availableItems = useMemo(() => activeMenuItems.filter((item) => item.isAvailable), [activeMenuItems]);
  const categoryById = useMemo(() => new Map(sortedCategories.map((category) => [category.menuCategoryId, category])), [sortedCategories]);
  const itemCountsByCategory = useMemo(() => {
    return items.reduce<Record<string, number>>((lookup, item) => {
      lookup[item.menuCategoryId] = (lookup[item.menuCategoryId] ?? 0) + 1;
      return lookup;
    }, {});
  }, [items]);
  const sortedItems = useMemo(() => {
    return [...activeMenuItems].sort((left, right) => {
      const leftCategoryOrder = categoryById.get(left.menuCategoryId)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder = categoryById.get(right.menuCategoryId)?.displayOrder ?? Number.MAX_SAFE_INTEGER;

      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }

      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder;
      }

      return left.name.localeCompare(right.name);
    });
  }, [activeMenuItems, categoryById]);
  const selectedCategory = selectedCategoryId === AllCategoryId ? null : categoryById.get(selectedCategoryId) ?? null;
  const selectedCategoryItems = useMemo(
    () => (selectedCategoryId === AllCategoryId ? sortedItems : sortedItems.filter((item) => item.menuCategoryId === selectedCategoryId)),
    [selectedCategoryId, sortedItems]
  );
  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();

    return selectedCategoryItems.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query) ||
        formatDietType(item.dietTypeCode).toLowerCase().includes(query);
      const matchesStatus =
        itemStatusFilter === "all" ||
        (itemStatusFilter === "available" && item.isAvailable) ||
        (itemStatusFilter === "hidden" && !item.isAvailable);
      const matchesDiet = itemDietFilter === "all" || item.dietTypeCode === itemDietFilter;

      return matchesSearch && matchesStatus && matchesDiet;
    });
  }, [itemDietFilter, itemSearch, itemStatusFilter, selectedCategoryItems]);
  const itemTotalPages = Math.max(1, Math.ceil(filteredItems.length / itemPageSize));
  const safeItemPage = Math.min(itemPage, itemTotalPages);
  const pagedItems = useMemo(() => {
    const startIndex = (safeItemPage - 1) * itemPageSize;
    return filteredItems.slice(startIndex, startIndex + itemPageSize);
  }, [filteredItems, itemPageSize, safeItemPage]);
  const itemShowingFrom = filteredItems.length === 0 ? 0 : (safeItemPage - 1) * itemPageSize + 1;
  const itemShowingTo = filteredItems.length === 0 ? 0 : Math.min(filteredItems.length, itemShowingFrom + pagedItems.length - 1);
  const averagePrice = useMemo(() => {
    if (activeMenuItems.length === 0) {
      return 0;
    }

    return activeMenuItems.reduce((total, item) => total + item.price, 0) / activeMenuItems.length;
  }, [activeMenuItems]);

  useEffect(() => {
    if (!workspace.selectedBranch) {
      setCategories([]);
      setItems([]);
      return;
    }

    void loadMenu(workspace.selectedBranch.branchId);
  }, [workspace.selectedBranch?.branchId]);

  useEffect(() => {
    setItemPage(1);
  }, [itemDietFilter, itemPageSize, itemSearch, itemStatusFilter, selectedCategoryId]);

  useEffect(() => {
    if (itemPage > itemTotalPages) {
      setItemPage(itemTotalPages);
    }
  }, [itemPage, itemTotalPages]);

  useEffect(() => {
    if (selectedCategoryId !== AllCategoryId && !categoryById.has(selectedCategoryId)) {
      setSelectedCategoryId(AllCategoryId);
    }
  }, [categoryById, selectedCategoryId]);

  async function loadMenu(branchId: string) {
    setIsLoadingMenu(true);

    try {
      const [categoryResponse, itemResponse] = await Promise.all([getMenuCategories(branchId, true), getMenuItems(branchId)]);
      const activeCategoryResponse = categoryResponse.filter((category) => category.isActive);
      setCategories(categoryResponse);
      setItems(itemResponse);
      setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categoryResponse.length + 1) });
      setItemForm({
        ...EmptyItemForm,
        menuCategoryId: activeCategoryResponse[0]?.menuCategoryId ?? "",
        displayOrder: String(itemResponse.length + 1)
      });
      setEditingCategoryId(null);
      setEditingCategoryForm(EmptyCategoryForm);
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
      setIsCategoryDialogOpen(false);
      setIsItemDialogOpen(false);
      setSelectedCategoryId(AllCategoryId);
      setItemSearch("");
      setItemStatusFilter("all");
      setItemDietFilter("all");
      setItemPage(1);
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setIsLoadingMenu(false);
    }
  }

  async function runSaving(key: string, action: () => Promise<void>) {
    setSavingKey(key);
    setMenuNotice(null);

    try {
      await action();
    } catch (caught) {
      workspace.handleApiError(caught);
    } finally {
      setSavingKey(null);
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateCategoryForm(categoryForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving("category", async () => {
      const category = await createMenuCategory(workspace.selectedBranch!.branchId, {
        name: categoryForm.name.trim(),
        displayOrder: toPositiveNumber(categoryForm.displayOrder)
      });

      setCategories((current) => [...current, category]);
      setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categories.length + 2) });
      setItemForm((current) => ({
        ...current,
        menuCategoryId: current.menuCategoryId || category.menuCategoryId
      }));
      setSelectedCategoryId(category.menuCategoryId);
      setItemPage(1);
      setMenuNotice("Menu category added.");
      setIsCategoryDialogOpen(false);
    });
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateItemForm(itemForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving("item", async () => {
      const item = await createMenuItem(workspace.selectedBranch!.branchId, {
        menuCategoryId: itemForm.menuCategoryId,
        name: itemForm.name.trim(),
        description: optional(itemForm.description),
        price: getItemFormPrice(itemForm),
        dietTypeCode: itemForm.dietTypeCode,
        isAvailable: itemForm.isAvailable,
        displayOrder: toPositiveNumber(itemForm.displayOrder),
        imageUrl: optional(itemForm.imageUrl),
        imageAltText: itemForm.imageUrl ? optional(itemForm.imageAltText) ?? itemForm.name.trim() : null,
        variants: toVariantInput(itemForm.variants)
      });

      setItems((current) => [...current, item]);
      setItemForm((current) => ({
        ...EmptyItemForm,
        menuCategoryId: current.menuCategoryId,
        displayOrder: String(items.length + 2)
      }));
      if (selectedCategoryId !== AllCategoryId && selectedCategoryId !== item.menuCategoryId) {
        setSelectedCategoryId(item.menuCategoryId);
      }
      setItemPage(1);
      setMenuNotice("Menu item added.");
      setIsItemDialogOpen(false);
    });
  }

  function handleOpenCreateCategory() {
    setMenuNotice(null);
    setEditingCategoryId(null);
    setEditingCategoryForm(EmptyCategoryForm);
    setCategoryForm({ ...EmptyCategoryForm, displayOrder: String(categories.length + 1) });
    setIsCategoryDialogOpen(true);
  }

  function handleStartEditCategory(category: MenuCategory) {
    setMenuNotice(null);
    setEditingCategoryId(category.menuCategoryId);
    setEditingCategoryForm({
      name: category.name,
      displayOrder: String(category.displayOrder)
    });
    setIsCategoryDialogOpen(true);
  }

  function handleCancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryForm(EmptyCategoryForm);
    setIsCategoryDialogOpen(false);
  }

  async function handleSaveCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateCategoryForm(editingCategoryForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving(`category-edit-${category.menuCategoryId}`, async () => {
      const updated = await updateMenuCategory(workspace.selectedBranch!.branchId, category.menuCategoryId, {
        name: editingCategoryForm.name.trim(),
        displayOrder: toPositiveNumber(editingCategoryForm.displayOrder),
        isActive: category.isActive
      });

      setCategories((current) => current.map((currentCategory) => (currentCategory.menuCategoryId === updated.menuCategoryId ? updated : currentCategory)));
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.menuCategoryId === updated.menuCategoryId ? { ...currentItem, categoryName: updated.name } : currentItem
        )
      );
      setEditingCategoryId(null);
      setEditingCategoryForm(EmptyCategoryForm);
      setMenuNotice("Menu category updated.");
      setIsCategoryDialogOpen(false);
    });
  }

  async function handleDeactivateCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`category-${category.menuCategoryId}`, async () => {
      await deactivateMenuCategory(workspace.selectedBranch!.branchId, category.menuCategoryId);
      setCategories((current) =>
        current.map((currentCategory) =>
          currentCategory.menuCategoryId === category.menuCategoryId
            ? { ...currentCategory, isActive: false, updatedAtUtc: new Date().toISOString() }
            : currentCategory
        )
      );
      if (itemForm.menuCategoryId === category.menuCategoryId) {
        setItemForm((current) => ({
          ...current,
          menuCategoryId: categories.find((currentCategory) => currentCategory.menuCategoryId !== category.menuCategoryId && currentCategory.isActive)?.menuCategoryId ?? ""
        }));
      }
      if (selectedCategoryId === category.menuCategoryId) {
        setSelectedCategoryId(AllCategoryId);
      }
      if (editingCategoryId === category.menuCategoryId) {
        setEditingCategoryId(null);
        setEditingCategoryForm(EmptyCategoryForm);
      }
      setMenuNotice("Menu category turned off.");
    });
  }

  async function handleEnableCategory(category: MenuCategory) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`category-enable-${category.menuCategoryId}`, async () => {
      const updated = await updateMenuCategory(workspace.selectedBranch!.branchId, category.menuCategoryId, {
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: true
      });

      setCategories((current) => current.map((currentCategory) => (currentCategory.menuCategoryId === updated.menuCategoryId ? updated : currentCategory)));
      setItemForm((current) => ({
        ...current,
        menuCategoryId: current.menuCategoryId || updated.menuCategoryId
      }));
      setSelectedCategoryId(updated.menuCategoryId);
      setItemPage(1);
      setMenuNotice("Menu category enabled.");
    });
  }

  function handleOpenCreateItem() {
    setMenuNotice(null);
    setEditingItemId(null);
    setEditingItemForm(EmptyItemForm);
    const defaultCategoryId =
      selectedCategoryId !== AllCategoryId && categoryById.has(selectedCategoryId)
        ? selectedCategoryId
        : itemForm.menuCategoryId || sortedCategories[0]?.menuCategoryId || "";
    setItemForm((current) => ({
      ...EmptyItemForm,
      menuCategoryId: defaultCategoryId || current.menuCategoryId || sortedCategories[0]?.menuCategoryId || "",
      displayOrder: String(items.length + 1)
    }));
    setIsItemDialogOpen(true);
  }

  function handleStartEditItem(item: MenuItem) {
    setMenuNotice(null);
    setEditingItemId(item.menuItemId);
    setEditingItemForm({
      menuCategoryId: item.menuCategoryId,
      name: item.name,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      imageAltText: item.imageAltText ?? "",
      price: String(item.price),
      dietTypeCode: item.dietTypeCode,
      displayOrder: String(item.displayOrder),
      isAvailable: item.isAvailable,
      variants: (item.variants ?? []).map((variant) => ({
        menuItemVariantId: variant.menuItemVariantId,
        name: variant.name,
        price: String(variant.price),
        displayOrder: String(variant.displayOrder),
        isAvailable: variant.isAvailable
      }))
    });
    setIsItemDialogOpen(true);
  }

  function handleCancelEditItem() {
    setEditingItemId(null);
    setEditingItemForm(EmptyItemForm);
    setIsItemDialogOpen(false);
  }

  async function handleSaveItem(item: MenuItem) {
    if (!workspace.selectedBranch) {
      return;
    }

    const validation = validateItemForm(editingItemForm);
    if (!validation.isValid) {
      workspace.setWorkspaceError(validation.message);
      return;
    }

    await runSaving(`item-edit-${item.menuItemId}`, async () => {
      const updated = await updateMenuItem(workspace.selectedBranch!.branchId, item.menuItemId, {
        menuCategoryId: editingItemForm.menuCategoryId,
        name: editingItemForm.name.trim(),
        description: optional(editingItemForm.description),
        price: getItemFormPrice(editingItemForm),
        dietTypeCode: editingItemForm.dietTypeCode,
        isAvailable: editingItemForm.isAvailable,
        isActive: item.isActive,
        displayOrder: toPositiveNumber(editingItemForm.displayOrder),
        imageUrl: optional(editingItemForm.imageUrl),
        imageAltText: editingItemForm.imageUrl ? optional(editingItemForm.imageAltText) ?? editingItemForm.name.trim() : null,
        variants: toVariantInput(editingItemForm.variants)
      });

      setItems((current) => current.map((currentItem) => (currentItem.menuItemId === updated.menuItemId ? updated : currentItem)));
      setEditingItemId(null);
      setEditingItemForm(EmptyItemForm);
      setMenuNotice("Menu item updated.");
      setIsItemDialogOpen(false);
    });
  }

  async function handleDeactivateItem(item: MenuItem) {
    if (!workspace.selectedBranch) {
      return;
    }

    await runSaving(`item-${item.menuItemId}`, async () => {
      await deactivateMenuItem(workspace.selectedBranch!.branchId, item.menuItemId);
      setItems((current) => current.filter((currentItem) => currentItem.menuItemId !== item.menuItemId));
      if (editingItemId === item.menuItemId) {
        setEditingItemId(null);
        setEditingItemForm(EmptyItemForm);
      }
      setMenuNotice("Menu item turned off.");
    });
  }

  const branchName = workspace.selectedBranch?.name ?? "Menu";
  const editingCategory = editingCategoryId ? categories.find((category) => category.menuCategoryId === editingCategoryId) ?? null : null;
  const editingItem = editingItemId ? items.find((item) => item.menuItemId === editingItemId) ?? null : null;
  const isEditingCategory = Boolean(editingCategory);
  const isEditingItem = Boolean(editingItem);
  const activeItemForm = isEditingItem ? editingItemForm : itemForm;
  const activeItemHasVariants = activeItemForm.variants.length > 0;
  const activeItemDerivedPrice = activeItemHasVariants ? getItemFormPrice(activeItemForm) : null;

  return (
    <AdminShell
      active="menu"
      branchName={branchName}
      branches={workspace.activeBranches}
      onLogout={workspace.logout}
      onSelectedBranchChange={workspace.setSelectedBranchId}
      selectedBranchId={workspace.selectedBranchId}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary" className="gap-2">
              <ChefHat size={14} />
              Menu
            </Badge>
            <h1 className="mt-4 text-headline-lg text-primary">Menu workspace</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Review categories, item images, and availability for the branch selected in the top nav.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" onClick={handleOpenCreateCategory} disabled={isLoadingMenu || !workspace.selectedBranch} className="w-full sm:w-auto">
              <Plus size={17} />
              Add category
            </Button>
            <Button type="button" onClick={handleOpenCreateItem} disabled={isLoadingMenu || sortedCategories.length === 0 || !workspace.selectedBranch} className="w-full sm:w-auto">
              <Plus size={17} />
              Add item
            </Button>
          </div>
        </header>

        <PageError message={workspace.workspaceError} />

        {workspace.isLoadingBranches ? (
          <PageLoading />
        ) : !workspace.selectedBranch ? (
          <EmptyBranchState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={<Layers3 size={20} />} label="Categories" value={isLoadingMenu ? "..." : String(sortedCategories.length)} note={inactiveCategories.length > 0 ? `${inactiveCategories.length} turned off` : undefined} />
              <MetricCard icon={<ChefHat size={20} />} label="Menu items" value={isLoadingMenu ? "..." : String(activeMenuItems.length)} />
              <MetricCard icon={<IndianRupee size={20} />} label="Average price" value={isLoadingMenu ? "..." : formatMoney(averagePrice)} note={`${availableItems.length} available`} />
            </section>

            <section className="overflow-hidden rounded-xl border border-outline-variant/70 bg-white shadow-sm">
              {menuNotice ? (
                <div className="border-b border-primary/15 bg-primary-fixed px-4 py-3 text-sm font-semibold text-primary">
                  {menuNotice}
                </div>
              ) : null}

              {isLoadingMenu ? (
                <div className="p-8">
                  <PageLoading />
                </div>
              ) : (
                <div className="grid min-h-[34rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <MenuCategorySidebar
                    categories={sortedCategories}
                    itemCountsByCategory={itemCountsByCategory}
                    inactiveCategories={inactiveCategories}
                    onAddCategory={handleOpenCreateCategory}
                    onDeactivateCategory={handleDeactivateCategory}
                    onEditCategory={handleStartEditCategory}
                    onEnableCategory={handleEnableCategory}
                    onSelectCategory={(categoryId) => setSelectedCategoryId(categoryId)}
                    savingKey={savingKey}
                    selectedCategoryId={selectedCategoryId}
                    totalItems={activeMenuItems.length}
                  />

                  <section className="min-w-0 border-t border-outline-variant/70 lg:border-l lg:border-t-0">
                    <div className="border-b border-outline-variant/70 bg-surface-container-low/60 px-4 py-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-black text-on-surface">{selectedCategory ? selectedCategory.name : "All menu items"}</h2>
                          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                            {filteredItems.length} of {selectedCategoryItems.length} item{selectedCategoryItems.length === 1 ? "" : "s"} shown
                          </p>
                        </div>
                        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                          <label className="relative min-w-0 sm:w-64">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                            <Input
                              className="h-10 bg-white pl-9"
                              value={itemSearch}
                              onChange={(event) => setItemSearch(event.target.value)}
                              placeholder="Search items"
                            />
                          </label>
                          <select
                            value={itemStatusFilter}
                            onChange={(event) => setItemStatusFilter(event.target.value as ItemStatusFilter)}
                            className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none"
                          >
                            <option value="all">All status</option>
                            <option value="available">Available</option>
                            <option value="hidden">Hidden</option>
                          </select>
                          <select
                            value={itemDietFilter}
                            onChange={(event) => setItemDietFilter(event.target.value as ItemDietFilter)}
                            className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none"
                          >
                            <option value="all">All food types</option>
                            {DietTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={itemPageSize}
                            onChange={(event) => {
                              const nextPageSize = Number(event.target.value);
                              setItemPageSize(MenuPageSizeOptions.includes(nextPageSize) ? nextPageSize : MenuPageSizeOptions[0]);
                            }}
                            className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none"
                            aria-label="Rows per page"
                          >
                            {MenuPageSizeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option} rows
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {activeMenuItems.length === 0 ? (
                      <MenuEmptyState
                        actionLabel={sortedCategories.length === 0 ? "Add category" : "Add item"}
                        actionIcon={Plus}
                        message={sortedCategories.length === 0 ? "Create or enable a category first, then add items inside it." : "Add your first item to start building this menu."}
                        onAction={sortedCategories.length === 0 ? handleOpenCreateCategory : handleOpenCreateItem}
                        title={sortedCategories.length === 0 ? "No active categories" : "No menu items yet"}
                      />
                    ) : filteredItems.length === 0 ? (
                      <MenuEmptyState
                        actionLabel="Clear filters"
                        actionIcon={RotateCcw}
                        message="Try another category, search term, status, or food type."
                        onAction={() => {
                          setItemSearch("");
                          setItemStatusFilter("all");
                          setItemDietFilter("all");
                          setSelectedCategoryId(AllCategoryId);
                        }}
                        title="No items match these filters"
                      />
                    ) : (
                      <>
                        <div className="grid gap-3 p-4 md:hidden">
                          {pagedItems.map((item) => (
                            <MenuItemMobileCard
                              key={item.menuItemId}
                              item={item}
                              savingKey={savingKey}
                              onDeactivate={handleDeactivateItem}
                              onEdit={handleStartEditItem}
                            />
                          ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Food type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pagedItems.map((item) => (
                                <MenuItemTableRow
                                  item={item}
                                  key={item.menuItemId}
                                  onDeactivate={handleDeactivateItem}
                                  onEdit={handleStartEditItem}
                                  savingKey={savingKey}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <MenuPagination
                          page={safeItemPage}
                          showingFrom={itemShowingFrom}
                          showingTo={itemShowingTo}
                          totalItems={filteredItems.length}
                          totalPages={itemTotalPages}
                          onPageChange={setItemPage}
                        />
                      </>
                    )}
                  </section>
                </div>
              )}
            </section>

            {isCategoryDialogOpen ? (
              <Dialog>
                <DialogContent className="max-w-lg p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle>{isEditingCategory ? "Edit category" : "Add category"}</DialogTitle>
                    <DialogDescription>{isEditingCategory ? "Update the category details shown on the menu." : "Create a category before adding menu items."}</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(event) => {
                      if (editingCategory) {
                        event.preventDefault();
                        void handleSaveCategory(editingCategory);
                        return;
                      }

                      void handleCreateCategory(event);
                    }}
                    className="mt-5 grid gap-4"
                  >
                    <Field label="Category name">
                      <Input
                        value={isEditingCategory ? editingCategoryForm.name : categoryForm.name}
                        onChange={(event) =>
                          isEditingCategory
                            ? setEditingCategoryForm({ ...editingCategoryForm, name: event.target.value })
                            : setCategoryForm({ ...categoryForm, name: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field label="Order">
                      <Input
                        type="number"
                        min="1"
                        value={isEditingCategory ? editingCategoryForm.displayOrder : categoryForm.displayOrder}
                        onChange={(event) =>
                          isEditingCategory
                            ? setEditingCategoryForm({ ...editingCategoryForm, displayOrder: event.target.value })
                            : setCategoryForm({ ...categoryForm, displayOrder: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <div className="grid gap-2 sm:flex sm:justify-end">
                      <Button type="button" variant="outline" onClick={handleCancelEditCategory} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingKey === "category" || (editingCategory ? savingKey === `category-edit-${editingCategory.menuCategoryId}` : false)} className="w-full sm:w-auto">
                        {savingKey === "category" || (editingCategory ? savingKey === `category-edit-${editingCategory.menuCategoryId}` : false) ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : isEditingCategory ? (
                          <Save size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                        {isEditingCategory ? "Update" : "Add Category"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            {isItemDialogOpen ? (
              <Dialog>
                <DialogContent className="flex max-h-[calc(100vh-1rem)] w-[min(96vw,56rem)] max-w-none flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]">
                  <div className="shrink-0 border-b border-outline-variant/70 bg-surface-container-low px-4 py-4 sm:px-6 sm:py-5">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black text-on-surface">{isEditingItem ? "Edit menu item" : "Add menu item"}</DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm font-semibold text-on-surface-variant">
                        {isEditingItem ? "Update the item details customers see on the QR menu." : "Create a menu item with image, pricing, availability, and optional portion sizes."}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <form
                    onSubmit={(event) => {
                      if (editingItem) {
                        event.preventDefault();
                        void handleSaveItem(editingItem);
                        return;
                      }

                      void handleCreateItem(event);
                    }}
                    className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
                  >
                    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-4 [scrollbar-width:none] sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-scrollbar]:hidden">
                      <div className="grid w-full min-w-0 gap-4 rounded-xl border border-outline-variant/70 bg-white p-4">
                        <div className="grid gap-4">
                          <Field label="Category">
                            <select
                              value={isEditingItem ? editingItemForm.menuCategoryId : itemForm.menuCategoryId}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, menuCategoryId: event.target.value })
                                  : setItemForm({ ...itemForm, menuCategoryId: event.target.value })
                              }
                              className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                              required
                              disabled={sortedCategories.length === 0}
                            >
                              {sortedCategories.length === 0 ? <option value="">Add or enable a category first</option> : null}
                              {sortedCategories.map((category) => (
                                <option key={category.menuCategoryId} value={category.menuCategoryId}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Item name">
                            <Input
                              className="h-11 bg-white font-semibold"
                              value={isEditingItem ? editingItemForm.name : itemForm.name}
                              onChange={(event) =>
                                isEditingItem ? setEditingItemForm({ ...editingItemForm, name: event.target.value }) : setItemForm({ ...itemForm, name: event.target.value })
                              }
                              placeholder="Masala tea"
                              required
                            />
                          </Field>
                          <Field label="Food type">
                            <select
                              value={activeItemForm.dietTypeCode}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, dietTypeCode: event.target.value as DietTypeCode })
                                  : setItemForm({ ...itemForm, dietTypeCode: event.target.value as DietTypeCode })
                              }
                              className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                              required
                            >
                              {DietTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Description">
                          <textarea
                            value={isEditingItem ? editingItemForm.description : itemForm.description}
                            onChange={(event) =>
                              isEditingItem
                                ? setEditingItemForm({ ...editingItemForm, description: event.target.value })
                                : setItemForm({ ...itemForm, description: event.target.value })
                            }
                            placeholder="Short description shown to customers"
                            className="min-h-20 w-full resize-y rounded-lg border border-input bg-white px-3 py-3 text-sm font-semibold text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-primary/30 focus:ring-2 focus:ring-ring/20"
                          />
                        </Field>
                        <Field label="Item image">
                          <MenuItemImagePicker
                            imageAltText={activeItemForm.imageAltText}
                            imageUrl={activeItemForm.imageUrl}
                            itemName={activeItemForm.name}
                            onChange={(next) =>
                              isEditingItem
                                ? setEditingItemForm({ ...editingItemForm, imageUrl: next.imageUrl, imageAltText: next.imageAltText })
                                : setItemForm({ ...itemForm, imageUrl: next.imageUrl, imageAltText: next.imageAltText })
                            }
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(12rem,0.7fr)] sm:items-end">
                          <Field label={activeItemHasVariants ? "Base price" : "Price"}>
                            <Input
                              className="h-11 bg-white font-semibold"
                              type="number"
                              min="0"
                              step="0.01"
                              value={activeItemHasVariants ? formatFormPrice(activeItemDerivedPrice ?? 0) : activeItemForm.price}
                              onChange={(event) =>
                                isEditingItem ? setEditingItemForm({ ...editingItemForm, price: event.target.value }) : setItemForm({ ...itemForm, price: event.target.value })
                              }
                              placeholder="0.00"
                              required={!activeItemHasVariants}
                              disabled={activeItemHasVariants}
                            />
                            {activeItemHasVariants ? (
                              <p className="text-xs font-semibold text-on-surface-variant">Auto set from the lowest variant price.</p>
                            ) : null}
                          </Field>
                          <Field label="Order">
                            <Input
                              className="h-11 bg-white font-semibold"
                              type="number"
                              min="1"
                              value={isEditingItem ? editingItemForm.displayOrder : itemForm.displayOrder}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, displayOrder: event.target.value })
                                  : setItemForm({ ...itemForm, displayOrder: event.target.value })
                              }
                              required
                            />
                          </Field>
                          <label className="flex h-11 items-center justify-between gap-4 rounded-lg border border-outline-variant/70 bg-surface-container-low px-4 text-sm font-bold text-on-surface">
                            <span>Available</span>
                            <input
                              type="checkbox"
                              checked={isEditingItem ? editingItemForm.isAvailable : itemForm.isAvailable}
                              onChange={(event) =>
                                isEditingItem
                                  ? setEditingItemForm({ ...editingItemForm, isAvailable: event.target.checked })
                                  : setItemForm({ ...itemForm, isAvailable: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-outline-variant text-primary"
                            />
                          </label>
                        </div>
                      </div>
                      <ItemVariantsEditor
                        form={isEditingItem ? editingItemForm : itemForm}
                        onChange={(nextForm) => (isEditingItem ? setEditingItemForm(nextForm) : setItemForm(nextForm))}
                      />
                    </div>
                    <div className="grid shrink-0 gap-2 border-t border-outline-variant/70 bg-surface-container-low px-4 py-4 sm:flex sm:flex-row-reverse sm:justify-start sm:px-6">
                      <Button type="submit" disabled={savingKey === "item" || (editingItem ? savingKey === `item-edit-${editingItem.menuItemId}` : false) || sortedCategories.length === 0} className="w-full sm:w-auto">
                        {savingKey === "item" || (editingItem ? savingKey === `item-edit-${editingItem.menuItemId}` : false) ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : isEditingItem ? (
                          <Save size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                        {isEditingItem ? "Update item" : "Add item"}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancelEditItem} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{label}</Label>
      {children}
    </div>
  );
}

function MenuCategorySidebar({
  categories,
  inactiveCategories,
  itemCountsByCategory,
  onAddCategory,
  onDeactivateCategory,
  onEditCategory,
  onEnableCategory,
  onSelectCategory,
  savingKey,
  selectedCategoryId,
  totalItems
}: {
  categories: MenuCategory[];
  inactiveCategories: MenuCategory[];
  itemCountsByCategory: Record<string, number>;
  onAddCategory: () => void;
  onDeactivateCategory: (category: MenuCategory) => void;
  onEditCategory: (category: MenuCategory) => void;
  onEnableCategory: (category: MenuCategory) => void;
  onSelectCategory: (categoryId: string) => void;
  savingKey: string | null;
  selectedCategoryId: string;
  totalItems: number;
}) {
  return (
    <aside className="min-w-0 bg-surface-container-low/45">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/70 px-4 py-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-on-surface">Categories</h2>
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">{categories.length} active</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddCategory} className="h-9 px-3">
          <Plus size={14} />
          Add
        </Button>
      </div>

      <div className="grid max-h-[28rem] gap-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-22rem)]">
        <CategorySelectRow
          accentColor={CategoryAccentColors[0]}
          active={selectedCategoryId === AllCategoryId}
          count={totalItems}
          helper="All categories"
          name="All items"
          onSelect={() => onSelectCategory(AllCategoryId)}
        />

        {categories.length === 0 ? (
          <div className="m-2 rounded-lg border border-dashed border-outline-variant/70 bg-white p-4 text-center text-sm font-semibold text-on-surface-variant">
            Add a category to organize your menu.
          </div>
        ) : (
          categories.map((category, index) => {
            const active = selectedCategoryId === category.menuCategoryId;
            const isSaving = savingKey === `category-${category.menuCategoryId}`;
            const itemCount = itemCountsByCategory[category.menuCategoryId] ?? 0;

            return (
              <div
                key={category.menuCategoryId}
                className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2 py-2 transition ${
                  active ? "border-primary/20 bg-primary-fixed" : "border-transparent bg-transparent hover:border-outline-variant/70 hover:bg-white"
                }`}
              >
                <button type="button" className="min-w-0 text-left" onClick={() => onSelectCategory(category.menuCategoryId)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CategoryAccentColors[(index + 1) % CategoryAccentColors.length] }} />
                    <div className="min-w-0">
                      <p className={active ? "truncate text-sm font-black text-primary" : "truncate text-sm font-extrabold text-on-surface"}>{category.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-on-surface-variant">
                        Order {category.displayOrder} - {itemCount} item{itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => onEditCategory(category)} className="h-8 w-8" aria-label={`Edit ${category.name}`}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeactivateCategory(category)}
                    disabled={isSaving}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Turn off ${category.name}`}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {inactiveCategories.length > 0 ? (
          <div className="mt-3 border-t border-outline-variant/70 pt-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-[11px] font-black uppercase tracking-wide text-on-surface-variant">Turned off</p>
              <Badge variant="outline" className="shrink-0">
                {inactiveCategories.length}
              </Badge>
            </div>
            <div className="grid gap-1">
              {inactiveCategories.map((category, index) => {
                const isEnabling = savingKey === `category-enable-${category.menuCategoryId}`;
                const itemCount = itemCountsByCategory[category.menuCategoryId] ?? 0;

                return (
                  <div
                    key={category.menuCategoryId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-dashed border-outline-variant/70 bg-white/70 px-2 py-2 opacity-90"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-on-surface-variant/40" style={{ backgroundColor: CategoryAccentColors[(index + categories.length + 1) % CategoryAccentColors.length] }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-on-surface-variant">{category.name}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-on-surface-variant">
                          Order {category.displayOrder} - {itemCount} item{itemCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => onEditCategory(category)} className="h-8 w-8" aria-label={`Edit ${category.name}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEnableCategory(category)}
                        disabled={isEnabling}
                        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                        aria-label={`Enable ${category.name}`}
                      >
                        {isEnabling ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function CategorySelectRow({
  accentColor,
  active,
  count,
  helper,
  name,
  onSelect
}: {
  accentColor: string;
  active: boolean;
  count: number;
  helper: string;
  name: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
        active ? "border-primary/20 bg-primary-fixed" : "border-transparent hover:border-outline-variant/70 hover:bg-white"
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
      <div className="min-w-0 flex-1">
        <p className={active ? "truncate text-sm font-black text-primary" : "truncate text-sm font-extrabold text-on-surface"}>{name}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-on-surface-variant">{helper}</p>
      </div>
      <Badge variant={active ? "secondary" : "outline"} className="shrink-0">
        {count}
      </Badge>
    </button>
  );
}

function MenuItemTableRow({
  item,
  onDeactivate,
  onEdit,
  savingKey
}: {
  item: MenuItem;
  onDeactivate: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  savingKey: string | null;
}) {
  const isSaving = savingKey === `item-${item.menuItemId}`;

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <MenuItemImage imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} />
          <div className="min-w-0">
            <p className="truncate font-extrabold text-on-surface">{item.name}</p>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-on-surface-variant">{item.description || "No description"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex max-w-40 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-primary">
          <span className="truncate">{item.categoryName}</span>
        </span>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-black text-primary">{formatMoney(item.price)}</p>
          {item.variants.length > 0 ? <p className="mt-1 text-xs font-semibold text-on-surface-variant">{item.variants.length} variant{item.variants.length === 1 ? "" : "s"}</p> : null}
        </div>
      </TableCell>
      <TableCell>
        <DietTypeBadge dietTypeCode={item.dietTypeCode} />
      </TableCell>
      <TableCell>
        <Badge variant={item.isAvailable ? "success" : "outline"} className="w-fit">
          {item.isAvailable ? "Available" : "Hidden"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => onEdit(item)} className="h-9 w-9 border-outline-variant/60" aria-label={`Edit ${item.name}`}>
            <Pencil size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onDeactivate(item)}
            disabled={isSaving}
            className="h-9 w-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Turn off ${item.name}`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MenuEmptyState({
  actionLabel,
  actionIcon: ActionIcon,
  disabled = false,
  message,
  onAction,
  title
}: {
  actionLabel: string;
  actionIcon: typeof Plus;
  disabled?: boolean;
  message: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="m-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low p-8 text-center">
      <div>
        <ChefHat size={30} className="mx-auto text-on-surface-variant/70" />
        <p className="mt-3 text-sm font-extrabold text-on-surface">{title}</p>
        <p className="mt-1 max-w-md text-sm font-semibold text-on-surface-variant">{message}</p>
        <Button type="button" className="mt-5" onClick={onAction} disabled={disabled}>
          <ActionIcon size={16} />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function MenuPagination({
  onPageChange,
  page,
  showingFrom,
  showingTo,
  totalItems,
  totalPages
}: {
  onPageChange: (page: number) => void;
  page: number;
  showingFrom: number;
  showingTo: number;
  totalItems: number;
  totalPages: number;
}) {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-on-surface-variant">
        Showing {showingFrom}-{showingTo} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!canGoBack} onClick={() => onPageChange(Math.max(1, page - 1))}>
          <ChevronLeft size={15} />
          Previous
        </Button>
        <span className="min-w-16 text-center text-sm font-black text-on-surface">
          {page} / {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={!canGoForward} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}

function DietTypeBadge({ dietTypeCode }: { dietTypeCode: DietTypeCode }) {
  if (dietTypeCode === "Unspecified") {
    return <Badge variant="outline" className="w-fit">Food type not set</Badge>;
  }

  return (
    <Badge variant={dietTypeCode === "Veg" || dietTypeCode === "Vegan" || dietTypeCode === "Jain" ? "success" : "secondary"} className="w-fit">
      {formatDietType(dietTypeCode)}
    </Badge>
  );
}

function formatDietType(dietTypeCode: DietTypeCode): string {
  return DietTypeOptions.find((option) => option.value === dietTypeCode)?.label ?? "Unspecified";
}

function ItemVariantsEditor({ form, onChange }: { form: ItemForm; onChange: (form: ItemForm) => void }) {
  function updateVariant(index: number, patch: Partial<ItemVariantForm>) {
    onChange({
      ...form,
      variants: form.variants.map((variant, currentIndex) => (currentIndex === index ? { ...variant, ...patch } : variant))
    });
  }

  function addVariant() {
    onChange({
      ...form,
      variants: [
        ...form.variants,
        {
          menuItemVariantId: null,
          name: "",
          price: "",
          displayOrder: String(form.variants.length + 1),
          isAvailable: true
        }
      ]
    });
  }

  function removeVariant(index: number) {
    onChange({
      ...form,
      variants: form.variants.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  return (
    <section className="grid w-full min-w-0 gap-4 rounded-xl border border-outline-variant/70 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-on-surface">Portions / sizes</p>
          <p className="mt-1 text-xs text-on-surface-variant">Use for Half, Full, Quarter, Regular, 300ml, Large, and similar options.</p>
        </div>
        <Button type="button" variant="outline" onClick={addVariant} className="h-11 w-full sm:w-auto">
          <Plus size={14} />
          Add Variant
        </Button>
      </div>

      {form.variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant/60 bg-white px-3 py-3 text-sm font-semibold text-on-surface-variant">
          No variants. Customers will order this item at the single price above.
        </p>
      ) : (
        <div className="grid gap-3">
          {form.variants.map((variant, index) => (
            <div key={`${variant.menuItemVariantId ?? "new"}-${index}`} className="grid gap-3 rounded-lg border border-outline-variant/30 bg-white p-3 lg:grid-cols-[1fr_8rem_6rem_auto]">
              <Field label="Variant">
                <Input value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} placeholder="Half, Full, 300ml" required />
              </Field>
              <Field label="Price">
                <Input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} required />
              </Field>
              <Field label="Order">
                <Input type="number" min="1" value={variant.displayOrder} onChange={(event) => updateVariant(index, { displayOrder: event.target.value })} required />
              </Field>
              <div className="grid gap-2 sm:flex sm:items-end">
                <label className="flex h-11 items-center gap-2 rounded-lg border border-outline-variant/60 px-3 text-sm font-semibold text-on-surface sm:border-0 sm:px-0">
                  <input
                    type="checkbox"
                    checked={variant.isAvailable}
                    onChange={(event) => updateVariant(index, { isAvailable: event.target.checked })}
                    className="h-4 w-4 rounded border-outline-variant text-primary"
                  />
                  Available
                </label>
                <Button type="button" variant="outline" onClick={() => removeVariant(index)} className="h-11 border-destructive/30 text-destructive">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MenuItemMobileCard({
  item,
  savingKey,
  onDeactivate,
  onEdit
}: {
  item: MenuItem;
  savingKey: string | null;
  onDeactivate: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
}) {
  const isSaving = savingKey === `item-${item.menuItemId}`;

  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-sm">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 p-3">
        <MenuItemImage imageAltText={item.imageAltText} imageUrl={item.imageUrl} name={item.name} size="large" />

        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-[15px] font-extrabold leading-5 text-on-surface">{item.name}</p>
              <p className="mt-1 truncate text-xs font-bold text-on-surface-variant">{item.categoryName}</p>
            </div>
            <Badge variant={item.isAvailable ? "success" : "outline"} className="shrink-0">
              {item.isAvailable ? "Live" : "Hidden"}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <DietTypeBadge dietTypeCode={item.dietTypeCode} />
          </div>

          <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-on-surface-variant">{item.description || "No description"}</p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-outline-variant/50 bg-surface-container-lowest px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-normal text-on-surface-variant">Price</p>
          <p className="truncate text-lg font-extrabold leading-6 text-primary">{formatMoney(item.price)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onEdit(item)} className="h-10 px-3" aria-label={`Edit ${item.name}`}>
            <Pencil size={15} />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDeactivate(item)}
            disabled={isSaving}
            className="h-10 border-destructive/30 px-3 text-destructive"
            aria-label={`Turn off ${item.name}`}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
            Off
          </Button>
        </div>
      </div>
    </article>
  );
}

function MenuItemImage({ imageAltText, imageUrl, name, size = "default" }: { imageAltText: string | null; imageUrl: string | null; name: string; size?: "default" | "large" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary-container font-black text-primary ${size === "large" ? "h-[4.75rem] w-[4.75rem] text-base" : "h-12 w-12 text-sm"}`}>
      {imageUrl ? <img src={imageUrl} alt={imageAltText ?? name} className="h-full w-full object-cover" /> : initials || <ChefHat size={18} />}
    </div>
  );
}

function toPositiveNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function validateCategoryForm(form: CategoryForm) {
  return firstInvalid(
    validateRequired(form.name, "Category name"),
    validatePositiveInteger(form.displayOrder, "Order")
  );
}

function validateItemForm(form: ItemForm) {
  return firstInvalid(
    validateRequired(form.menuCategoryId, "Category"),
    validateRequired(form.name, "Item name"),
    validateOptionalText(form.description, "Description", 500),
    form.variants.length > 0 ? validItemVariants(form.variants) : validateMoney(form.price, "Price"),
    validatePositiveInteger(form.displayOrder, "Order")
  );
}

function validItemVariants(variants: ItemVariantForm[]) {
  if (variants.length === 0) {
    return { isValid: true, message: null };
  }

  for (const [index, variant] of variants.entries()) {
    const validation = firstInvalid(
      validateRequired(variant.name, `Variant ${index + 1} name`),
      validateMoney(variant.price, `Variant ${index + 1} price`),
      validatePositiveInteger(variant.displayOrder, `Variant ${index + 1} order`)
    );

    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true, message: null };
}

function getItemFormPrice(form: ItemForm): number {
  const variantPrices = form.variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  if (variantPrices.length > 0) {
    return Math.min(...variantPrices);
  }

  const price = Number(form.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function formatFormPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

function optional(value: string): string | null {
  const cleaned = value.trim();
  return cleaned.length === 0 ? null : cleaned;
}

function toVariantInput(variants: ItemVariantForm[]) {
  return variants
    .filter((variant) => variant.name.trim().length > 0)
    .map((variant) => ({
      menuItemVariantId: variant.menuItemVariantId,
      name: variant.name.trim(),
      price: Number(variant.price),
      isAvailable: variant.isAvailable,
      displayOrder: toPositiveNumber(variant.displayOrder)
    }));
}
