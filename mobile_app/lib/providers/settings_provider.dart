import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

final settingsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final db = FirebaseFirestore.instance;
  final doc = await db.collection('settings').doc('global').get();
  
  if (doc.exists && doc.data() != null) {
    return doc.data()!;
  }
  
  // Default fallback values if document doesn't exist
  return {
    'gstRate': 0.05, // 5% default
  };
});
