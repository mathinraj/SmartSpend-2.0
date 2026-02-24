import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import './Categories.css';

const EMOJI_OPTIONS = [
  '🍔', '🚗', '🛍️', '📄', '🏥', '🎬', '✈️', '📚', '👤', '📦',
  '🏠', '🎮', '🎵', '💻', '🏋️', '🐾', '👶', '💼', '🎁', '📱',
  '☕', '🍕', '🚌', '⛽', '💊', '🎭', '⚽', '🧹', '💇', '🔧',
  '💰', '🏢', '📈', '↩️', '🏦', '💵', '👛', '🎯', '🎨', '🌿',
];

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#74B9FF', '#A29BFE', '#FD79A8', '#B2BEC3',
  '#00B894', '#00CEC9', '#0984E3', '#6C5CE7', '#E17055',
  '#FDCB6E', '#81ECEC', '#55A3E8', '#FF7675', '#636E72',
];

export default function Categories() {
  const { state, dispatch } = useApp();
  const { categories } = state;

  const [activeTab, setActiveTab] = useState('expense');
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [parentCatId, setParentCatId] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);

  const [catForm, setCatForm] = useState({ name: '', icon: '📦', color: '#6C5CE7' });
  const [subForm, setSubForm] = useState({ name: '' });
  const [reorderMode, setReorderMode] = useState(false);
  const dragIndex = useRef(null);

  const currentCategories = activeTab === 'expense' ? categories.expense : categories.income;

  function moveCategory(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= currentCategories.length) return;
    const actionType = activeTab === 'expense' ? 'REORDER_EXPENSE_CATEGORIES' : 'REORDER_INCOME_CATEGORIES';
    dispatch({ type: actionType, payload: { fromIndex: fromIdx, toIndex: toIdx } });
  }

  function handleDragStart(idx) { dragIndex.current = idx; }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDrop(idx) {
    if (dragIndex.current !== null && dragIndex.current !== idx) {
      moveCategory(dragIndex.current, idx);
    }
    dragIndex.current = null;
  }

  function openAddCategory() {
    setEditingCat(null);
    setCatForm({ name: '', icon: '📦', color: '#6C5CE7' });
    setShowCatModal(true);
  }

  function openEditCategory(cat) {
    setEditingCat(cat);
    setCatForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setShowCatModal(true);
  }

  function handleSaveCategory(e) {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    if (editingCat) {
      const actionType = activeTab === 'expense' ? 'UPDATE_CATEGORY' : 'UPDATE_INCOME_CATEGORY';
      dispatch({
        type: actionType,
        payload: { id: editingCat.id, name: catForm.name.trim(), icon: catForm.icon, color: catForm.color },
      });
    } else {
      const actionType = activeTab === 'expense' ? 'ADD_CATEGORY' : 'ADD_INCOME_CATEGORY';
      const payload = { name: catForm.name.trim(), icon: catForm.icon, color: catForm.color };
      if (activeTab === 'expense') payload.subcategories = [];
      dispatch({ type: actionType, payload });
    }
    setShowCatModal(false);
  }

  function handleDeleteCategory(id) {
    if (!window.confirm('Delete this category? Existing transactions will keep their data.')) return;
    dispatch({ type: activeTab === 'expense' ? 'DELETE_CATEGORY' : 'DELETE_INCOME_CATEGORY', payload: id });
  }

  function openAddSubcategory(catId) {
    setParentCatId(catId);
    setEditingSub(null);
    setSubForm({ name: '' });
    setShowSubModal(true);
  }

  function openEditSubcategory(catId, sub) {
    setParentCatId(catId);
    setEditingSub(sub);
    setSubForm({ name: sub.name });
    setShowSubModal(true);
  }

  function handleSaveSubcategory(e) {
    e.preventDefault();
    if (!subForm.name.trim()) return;

    if (editingSub) {
      dispatch({
        type: 'UPDATE_SUBCATEGORY',
        payload: { categoryId: parentCatId, subcategory: { id: editingSub.id, name: subForm.name.trim() } },
      });
    } else {
      dispatch({
        type: 'ADD_SUBCATEGORY',
        payload: { categoryId: parentCatId, subcategory: { name: subForm.name.trim() } },
      });
    }
    setShowSubModal(false);
  }

  function handleDeleteSubcategory(catId, subId) {
    if (!window.confirm('Delete this subcategory?')) return;
    dispatch({ type: 'DELETE_SUBCATEGORY', payload: { categoryId: catId, subcategoryId: subId } });
  }

  return (
    <div className="page">
      <div className="section-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Categories</h1>
        <div className="section-header-actions">
          {currentCategories.length > 1 && (
            <button
              className={`btn btn-sm ${reorderMode ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => { setReorderMode(!reorderMode); setExpandedCat(null); }}
            >
              <i className="fa-solid fa-arrows-up-down" /> {reorderMode ? 'Done' : 'Reorder'}
            </button>
          )}
          {!reorderMode && (
            <button className="btn btn-primary btn-sm" onClick={openAddCategory}>
              <i className="fa-solid fa-plus" /> New
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => { setActiveTab('expense'); setExpandedCat(null); }}>
          <i className="fa-solid fa-arrow-trend-down" style={{ marginRight: 6 }} />Expense
        </button>
        <button className={`tab ${activeTab === 'income' ? 'active' : ''}`} onClick={() => { setActiveTab('income'); setExpandedCat(null); }}>
          <i className="fa-solid fa-arrow-trend-up" style={{ marginRight: 6 }} />Income
        </button>
      </div>

      {currentCategories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fa-solid fa-tags" /></div>
          <p>No categories yet. Create one!</p>
        </div>
      ) : (
        <div className="cat-manage-list">
          {currentCategories.map((cat, idx) => {
            const isExpanded = !reorderMode && expandedCat === cat.id;
            const subcatCount = activeTab === 'expense' && cat.subcategories ? cat.subcategories.length : 0;
            return (
              <div
                key={cat.id}
                className={`cat-card ${isExpanded ? 'expanded' : ''} ${reorderMode ? 'reorder-active' : ''}`}
                draggable={reorderMode}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
              >
                <div
                  className="cat-card-header"
                  onClick={() => !reorderMode && activeTab === 'expense' && setExpandedCat(isExpanded ? null : cat.id)}
                >
                  {reorderMode && (
                    <div className="reorder-controls-row">
                      <button
                        className="reorder-btn"
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); moveCategory(idx, idx - 1); }}
                      >
                        <i className="fa-solid fa-chevron-up" />
                      </button>
                      <span className="reorder-handle"><i className="fa-solid fa-grip-vertical" /></span>
                      <button
                        className="reorder-btn"
                        disabled={idx === currentCategories.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveCategory(idx, idx + 1); }}
                      >
                        <i className="fa-solid fa-chevron-down" />
                      </button>
                    </div>
                  )}
                  <div className="cat-card-left">
                    <span className="cat-card-icon" style={{ background: cat.color + '18', color: cat.color }}>
                      {cat.icon}
                    </span>
                    <div className="cat-card-info">
                      <p className="cat-card-name">{cat.name}</p>
                      {activeTab === 'expense' && !reorderMode && (
                        <p className="cat-card-meta">
                          {subcatCount} {subcatCount === 1 ? 'subcategory' : 'subcategories'}
                        </p>
                      )}
                    </div>
                  </div>
                  {!reorderMode && (
                    <div className="cat-card-actions">
                      <button
                        className="cat-icon-btn edit"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="cat-icon-btn delete"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                      {activeTab === 'expense' && (
                        <span className={`cat-card-chevron ${isExpanded ? 'open' : ''}`}>
                          <i className="fa-solid fa-chevron-down" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {activeTab === 'expense' && isExpanded && (
                  <div className="cat-card-body">
                    {cat.subcategories && cat.subcategories.length > 0 ? (
                      <div className="subcat-list">
                        {cat.subcategories.map((sub) => (
                          <div key={sub.id} className="subcat-row">
                            <div className="subcat-row-left">
                              <span className="subcat-dot" style={{ background: cat.color }} />
                              <span className="subcat-row-name">{sub.name}</span>
                            </div>
                            <div className="subcat-row-actions">
                              <button className="subcat-icon-btn" title="Edit" onClick={() => openEditSubcategory(cat.id, sub)}>
                                <i className="fa-solid fa-pen-to-square" />
                              </button>
                              <button className="subcat-icon-btn danger" title="Delete" onClick={() => handleDeleteSubcategory(cat.id, sub.id)}>
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="subcat-empty">No subcategories yet</p>
                    )}
                    <button className="add-subcat-btn" onClick={() => openAddSubcategory(cat.id)}>
                      <i className="fa-solid fa-plus" />
                      <span>Add Subcategory</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSaveCategory}>
          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-font" style={{ marginRight: 6 }} />Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Category name"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-regular fa-face-smile" style={{ marginRight: 6 }} />Icon</label>
            <div className="emoji-picker">
              {EMOJI_OPTIONS.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  className={`emoji-option ${catForm.icon === emoji ? 'selected' : ''}`}
                  onClick={() => setCatForm({ ...catForm, icon: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-palette" style={{ marginRight: 6 }} />Color</label>
            <div className="color-picker">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${catForm.color === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setCatForm({ ...catForm, color })}
                />
              ))}
            </div>
          </div>

          <div className="cat-preview-bar">
            <span className="cat-preview-icon" style={{ background: catForm.color + '18' }}>
              {catForm.icon}
            </span>
            <span className="cat-preview-name">{catForm.name || 'Category Name'}</span>
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            <i className="fa-solid fa-check" />
            {editingCat ? 'Save Changes' : 'Create Category'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title={editingSub ? 'Edit Subcategory' : 'New Subcategory'}>
        <form onSubmit={handleSaveSubcategory}>
          <div className="form-group">
            <label className="form-label"><i className="fa-solid fa-tag" style={{ marginRight: 6 }} />Subcategory Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Groceries, Coffee..."
              value={subForm.name}
              onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            <i className="fa-solid fa-check" />
            {editingSub ? 'Save Changes' : 'Add Subcategory'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
