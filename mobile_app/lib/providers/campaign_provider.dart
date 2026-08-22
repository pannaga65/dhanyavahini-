import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class CampaignModel {
  final String id;
  final String title;
  final String body;
  final String type;
  final String imageUrl;

  CampaignModel({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.imageUrl,
  });

  factory CampaignModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return CampaignModel(
      id: doc.id,
      title: data['title'] ?? '',
      body: data['body'] ?? '',
      type: data['type'] ?? 'general',
      imageUrl: data['imageUrl'] ?? '',
    );
  }
}

final campaignsProvider = StreamProvider<List<CampaignModel>>((ref) {
  return FirebaseFirestore.instance
      .collection('campaigns')
      .where('isActive', isEqualTo: true)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .map((doc) => CampaignModel.fromFirestore(doc))
          .toList());
});
