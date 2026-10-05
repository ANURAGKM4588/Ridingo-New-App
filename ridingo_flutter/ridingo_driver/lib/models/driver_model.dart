class DriverModel {
  final String id;
  final String name;
  final String phone;
  final double rating;
  final int tripsCount;
  final bool online;
  final int todayEarnings;
  final int walletBalance;
  final Map<String, bool> vehicleCategories;
  final Map<String, bool> tripTypes;

  const DriverModel({
    required this.id,
    required this.name,
    required this.phone,
    this.rating = 4.93,
    this.tripsCount = 1248,
    this.online = true,
    this.todayEarnings = 2450,
    this.walletBalance = 8900,
    this.vehicleCategories = const {
      'Manual': true,
      'Automatic': true,
      'Luxury': true,
      'EV': true,
    },
    this.tripTypes = const {
      'hourly': true,
      'airport': true,
      'daily': true,
      'outstation': true,
      'event': true,
    },
  });

  DriverModel copyWith({
    bool? online,
    int? todayEarnings,
    int? walletBalance,
    Map<String, bool>? vehicleCategories,
    Map<String, bool>? tripTypes,
  }) {
    return DriverModel(
      id: id,
      name: name,
      phone: phone,
      rating: rating,
      tripsCount: tripsCount,
      online: online ?? this.online,
      todayEarnings: todayEarnings ?? this.todayEarnings,
      walletBalance: walletBalance ?? this.walletBalance,
      vehicleCategories: vehicleCategories ?? this.vehicleCategories,
      tripTypes: tripTypes ?? this.tripTypes,
    );
  }
}
