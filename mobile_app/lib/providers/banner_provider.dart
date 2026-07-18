import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/banner_model.dart';

final bannersProvider = FutureProvider<List<BannerModel>>((ref) async {
  final db = FirebaseFirestore.instance;
  
  final snapshot = await db
      .collection('banners')
      .where('isActive', isEqualTo: true)
      .orderBy('order')
      .get();
      
  return snapshot.docs
      .map((doc) => BannerModel.fromFirestore(doc.data(), doc.id))
      .toList();
});
