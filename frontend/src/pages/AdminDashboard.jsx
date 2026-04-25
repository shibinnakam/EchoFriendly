import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { getAuthToken, logout } from '../utils/auth';

const API_URL = 'https://dw2z2yix5k.execute-api.us-east-1.amazonaws.com/';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('prods');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getAuthToken();
            const headers = {
                'Authorization': token
            };

            if (activeTab === 'prods') {
                const res = await fetch(`${API_URL}inventory/products`, { headers });
                const data = await res.json();
                setProducts(data);
            } else if (activeTab === 'cats') {
                const res = await fetch(`${API_URL}inventory/categories`, { headers });
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
        setLoading(false);
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Permanently delete this ${type}?`)) return;
        const endpoint = type === 'product' ? 'products?productId=' : 'categories?categoryId=';
        
        const token = await getAuthToken();
        await fetch(`${API_URL}inventory/${endpoint}${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        fetchData();
    };

    return (
        <div className="admin-body">
            <aside className="sidebar">
                <div className="logo">
                    <i className="fa-solid fa-leaf"></i>
                    Echo<em>Friendly</em>
                </div>
                <nav className="nav-links">
                    <div className={`nav-item ${activeTab === 'dash' ? 'active' : ''}`} onClick={() => setActiveTab('dash')}>
                        <i className="fa-solid fa-house"></i> Dashboard
                    </div>
                    <div className={`nav-item ${activeTab === 'cats' ? 'active' : ''}`} onClick={() => setActiveTab('cats')}>
                        <i className="fa-solid fa-layer-group"></i> Categories
                    </div>
                    <div className={`nav-item ${activeTab === 'prods' ? 'active' : ''}`} onClick={() => setActiveTab('prods')}>
                        <i className="fa-solid fa-basket-shopping"></i> Products
                    </div>
                </nav>
                <div className="side-bottom">
                    <div className="nav-item"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="nav-item" style={{ color: '#ef4444' }} onClick={logout}><i className="fa-solid fa-power-off"></i> Logout</div>
                </div>
            </aside>

            <main className="main-content">
                <header className="hero-banner-react" style={{ backgroundImage: `url('/admin_banner_bg.png')` }}>
                    <div className="hero-card">
                        <div className="hero-info">
                            <h1>{activeTab === 'prods' ? 'Inventory Matrix' : activeTab === 'cats' ? 'Catalogue Categories' : 'Executive Terminal'}</h1>
                            <p>CORE REPOSITORY FOR GLOBAL SUSTAINABLE PRODUCTS</p>
                        </div>
                        <div className="user-pill">
                            <div className="user-info">
                                <span>Shibin Nakam</span>
                                <small>System Admin</small>
                            </div>
                            <div className="avatar">SN</div>
                        </div>
                    </div>
                </header>

                <section className="section-header">
                    <h2>{activeTab === 'prods' ? 'Inventory Matrix' : 'Product Categories'}</h2>
                    <button className="btn-black">
                        <i className="fa-solid fa-plus"></i> {activeTab === 'prods' ? 'New Product Entry' : 'Add New Category'}
                    </button>
                </section>

                <div className="table-card">
                    {loading ? <p>Loading data...</p> : (
                        <table className="data-table">
                            <thead>
                                {activeTab === 'prods' ? (
                                    <tr><th>Img</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
                                ) : (
                                    <tr><th>Img</th><th>Category</th><th>ID</th><th>Status</th><th>Visibility</th><th>Actions</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'prods' ? products.map(p => (
                                    <tr key={p.productId}>
                                        <td><img src={p.images?.[0]} style={{ width: '60px', borderRadius: '15px' }} /></td>
                                        <td><strong>{p.productName}</strong></td>
                                        <td>{p.categoryId}</td>
                                        <td><span className="price-tag">${p.price}</span></td>
                                        <td><strong>{p.stock}</strong></td>
                                        <td><span className="status-pill">Active</span></td>
                                        <td>
                                            <i className="fa-regular fa-pen-to-square edit-btn"></i>
                                            <i className="fa-regular fa-trash-can delete-btn" onClick={() => handleDelete('product', p.productId)}></i>
                                        </td>
                                    </tr>
                                )) : categories.map(c => (
                                    <tr key={c.categoryId}>
                                        <td><img src={c.categoryImage} style={{ width: '50px', borderRadius: '12px' }} /></td>
                                        <td><strong>{c.categoryName}</strong></td>
                                        <td>{c.categoryId}</td>
                                        <td><span className="status-pill">{c.status}</span></td>
                                        <td>{c.isHidden ? 'Hidden' : 'Visible'}</td>
                                        <td>
                                            <i className="fa-regular fa-pen-to-square edit-btn"></i>
                                            <i className="fa-regular fa-trash-can delete-btn" onClick={() => handleDelete('category', c.categoryId)}></i>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
