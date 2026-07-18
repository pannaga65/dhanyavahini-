class BannerModel {
  final String id;
  final String imageUrl;
  final String redirectLink;
  final bool isActive;
  final int order;

  BannerModel({
    required this.id,
    required this.imageUrl,
    required this.redirectLink,
    required this.isActive,
    required this.order,
  });

  factory BannerModel.fromFirestore(Map<String, dynamic> data, String id) {
    return BannerModel(
      id: id,
      imageUrl: data['imageUrl'] ?? '',
      redirectLink: data['redirectLink'] ?? '',
      isActive: data['isActive'] ?? true,
      order: data['order'] ?? 0,
    );
  }
}
