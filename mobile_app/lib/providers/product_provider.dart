import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product_model.dart';

final productsProvider = FutureProvider<List<ProductModel>>((ref) async {
  final db = FirebaseFirestore.instance;
  
  // 1. Fetch active products
  final productsSnapshot = await db
      .collection('products')
      .where('isActive', isEqualTo: true)
      .get();
      
  // 2. Fetch all inventory docs
  final inventorySnapshot = await db.collection('inventory').get();
  
  // 3. Map inventory for O(1) lookup
  final inventoryMap = <String, int>{};
  for (var doc in inventorySnapshot.docs) {
    inventoryMap[doc.id] = (doc.data()['availableStockKg'] ?? 0) as int;
  }
  
  // 4. Combine into ProductModels
  final products = productsSnapshot.docs.map((doc) {
    return ProductModel.fromFirestore(
      doc.data(), 
      doc.id, 
      inventoryStock: inventoryMap[doc.id] ?? 0
    );
  }).toList();
  
  return products;
});

final singleProductProvider = FutureProvider.family<ProductModel, String>((ref, productId) async {
  final db = FirebaseFirestore.instance;
  
  final productSnap = await db.collection('products').doc(productId).get();
  if (!productSnap.exists) {
    throw Exception('Product not found');
  }
  
  final inventorySnap = await db.collection('inventory').doc(productId).get();
  final inventoryStock = inventorySnap.exists 
      ? ((inventorySnap.data()?['availableStockKg'] ?? 0) as int) 
      : 0;
      
  return ProductModel.fromFirestore(
    productSnap.data()!, 
    productSnap.id, 
    inventoryStock: inventoryStock
  );
});
