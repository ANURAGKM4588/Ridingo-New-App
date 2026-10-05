class TripModel {
  final String id;
  final String cat;
  final int qty;
  final String pickup;
  final String drop;
  final int when;
  final int done;
  final bool mine;
  final Map<String, dynamic> rider;
  final Map<String, dynamic> car;
  final int fare;
  final int advance;
  final String status;
  final Map<String, dynamic>? driver;
  final int cashback;
  final String by;

  const TripModel({
    required this.id,
    required this.cat,
    required this.qty,
    required this.pickup,
    this.drop = '',
    required this.when,
    this.done = 0,
    this.mine = true,
    required this.rider,
    required this.car,
    required this.fare,
    required this.advance,
    required this.status,
    this.driver,
    this.cashback = 0,
    required this.by,
  });

  TripModel copyWith({
    String? status,
    Map<String, dynamic>? driver,
    int? done,
  }) {
    return TripModel(
      id: id,
      cat: cat,
      qty: qty,
      pickup: pickup,
      drop: drop,
      when: when,
      done: done ?? this.done,
      mine: mine,
      rider: rider,
      car: car,
      fare: fare,
      advance: advance,
      status: status ?? this.status,
      driver: driver ?? this.driver,
      cashback: cashback,
      by: by,
    );
  }

  factory TripModel.fromJson(Map<String, dynamic> map) {
    return TripModel(
      id: map['id']?.toString() ?? '',
      cat: map['cat'] ?? 'hourly',
      qty: (map['qty'] as num?)?.toInt() ?? 2,
      pickup: map['pickup'] ?? '',
      drop: map['drop'] ?? map['drop_loc'] ?? '',
      when: (map['when'] as num?)?.toInt() ?? (num.tryParse(map['when_ts']?.toString() ?? '0')?.toInt() ?? 0),
      done: (map['done'] as num?)?.toInt() ?? (num.tryParse(map['done_ts']?.toString() ?? '0')?.toInt() ?? 0),
      mine: map['mine'] ?? true,
      rider: map['rider'] != null ? Map<String, dynamic>.from(map['rider']) : {},
      car: map['car'] != null ? Map<String, dynamic>.from(map['car']) : {},
      fare: (map['fare'] as num?)?.toInt() ?? 0,
      advance: (map['advance'] as num?)?.toInt() ?? 0,
      status: map['status'] ?? 'pending',
      driver: map['driver'] != null ? Map<String, dynamic>.from(map['driver']) : null,
      cashback: (map['cashback'] as num?)?.toInt() ?? 0,
      by: map['by'] ?? map['by_who'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'cat': cat,
      'qty': qty,
      'pickup': pickup,
      'drop_loc': drop,
      'when_ts': when,
      'done_ts': done,
      'rider': rider,
      'car': car,
      'fare': fare,
      'advance': advance,
      'status': status,
      'driver': driver,
      'cashback': cashback,
      'by_who': by,
    };
  }
}
