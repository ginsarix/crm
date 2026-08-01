export type ChangeType =
  | 'new'
  | 'fix'
  | 'improved'
  | 'changed'
  | 'removed'
  | 'announcement';

export interface Change {
  type: ChangeType;
  title: string;
  desc?: string;
}

export interface Release {
  id: string;
  version: string;
  date: string;
  changes: Change[];
}

export const RELEASES: Release[] = [
  {
    id: 'v1-22',
    version: '1.22',
    date: '2 Ağustos 2026',
    changes: [
      {
        type: 'new',
        title: '"Boş Alan" filtresi',
        desc: 'Cari kartlar ve ziyaretler sayfalarında, seçilen alanı boş olan kayıtları gösteren yeni bir filtre eklendi.',
      },
      {
        type: 'new',
        title: 'Kayıtlı filtreler',
        desc: 'Cari kartlar ve ziyaretler sayfalarında, sık kullanılan filtre kombinasyonlarını isimlendirip kaydedebilir, daha sonra tek tıkla yeniden uygulayabilirsiniz.',
      },
      {
        type: 'new',
        title: 'Komut paleti',
        desc: 'Panel başlığındaki yeni arama barı ile veya Ctrl/Cmd+K kısayoluyla açılan komut paletiyle sayfalar arasında hızlıca geçiş yapabilir, cari kartları isim/sicil/GSM 1-2-3/meslek grubuna göre arayıp doğrudan kart görüntüleme ekranına gidebilirsiniz.',
      },
    ],
  },
  {
    id: 'v1-21',
    version: '1.21',
    date: '20 Temmuz 2026',
    changes: [
      {
        type: 'changed',
        title: 'Tüm cari kartlar artık herkese görünür',
        desc: 'Meslek grubunuza ait olmayan cari kartlar artık listeden gizlenmek yerine soluk (düşük opaklıkta) gösteriliyor.',
      },
    ],
  },
  {
    id: 'v1-20',
    version: '1.20',
    date: '2 Temmuz 2026',
    changes: [
      {
        type: 'announcement',
        title: 'Haziran ayı üye listeleri güncellenmiştir.',
      },
      {
        type: 'announcement',
        title:
          'Carilerde en başta İlçelerin Manuel olarak seçilmesi, boş alanları doldurulması rica olunur.',
      },
      {
        type: 'fix',
        title: 'Türkçe karakterlerle arama düzeltildi',
        desc: 'Ş, Ç, Ğ, Ö, Ü, I, İ gibi Türkçe karakterler içeren aramalarda büyük/küçük harf duyarlılığından dolayı eşleşmeyen sonuçlar düzeltildi.',
      },
      {
        type: 'new',
        title: 'Hesap Ayarları paneli',
        desc: 'Kenar çubuğundaki kullanıcı menüsünden profilinizi görüntüleyip adınızı güncelleyebilir, şifrenizi değiştirebilir, aktif oturumlarınızı ve size ait cari kart/ziyaret kayıtlarını inceleyebilirsiniz.',
      },
      {
        type: 'new',
        title: 'Sürüm notlarında duyuru türü',
        desc: 'Sürüm notları sayfasına, önemli duyuruların öne çıkarıldığı yeni bir "Duyuru" değişiklik türü eklendi.',
      },
    ],
  },
  {
    id: 'v1-19',
    version: '1.19',
    date: '26 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Ziyaretlerde satış temsilcisi',
        desc: 'Ziyaret oluşturma ve düzenleme formlarına satış temsilcisi alanı eklendi; ziyaret listesi üzerinden satış temsilcisine göre filtreleme de yapılabilir.',
      },
      {
        type: 'fix',
        title: 'Düzenleme sonrası satır yeniden sıralanması ',
        desc: 'Tablolarda düzenleme işlemlerinden sonra satırların yer değiştirmesi düzeltildi.',
      },
    ],
  },
  {
    id: 'v1-18',
    version: '1.18',
    date: '17 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Geri bildirim sistemi',
        desc: 'Panel başlığının sağındaki yeni simgeyle genel geri bildirim gönderebilirsiniz ve ayrıca sürüm geçmişinde her güncelleme için beğeni/beğenmeme butonları da eklendi.',
      },
      {
        type: 'fix',
        title: 'Tarih alanına manuel yazma düzeltildi',
        desc: 'Tarih alanına manuel (el ile) yazarken tarihin bozulması düzeltildi.',
      },
    ],
  },
  {
    id: 'v1-17',
    version: '1.17',
    date: '15 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Toplu işlemler',
        desc: 'Tüm tablolarda toplu silme, cari kartlarda toplu renk değiştirme. Seçili kayıtlar ekranın altında beliren çubukla yönetilir.',
      },
      {
        type: 'new',
        title: 'Dashboard — satış temsilcisi ziyaret sıralaması',
        desc: "Dashboard'a, en çok ziyaret gerçekleştiren satış temsilcilerini sıralayan yeni bir kart eklendi.",
      },
      {
        type: 'improved',
        title: 'Animasyon iyileştirmeleri',
        desc: 'Sayfa geçiş animasyonları yeniden ayarlandı; azaltılmış hareket tercihi artık destekleniyor.',
      },
    ],
  },
  {
    id: 'v1-16',
    version: '1.16',
    date: '12 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Mor renk — tam dashboard desteği',
        desc: 'Mor renk; dashboard sayacı, meslek grubu renk dağılımı çubukları ve yüzdelerinde artık tam olarak görünüyor.',
      },
      {
        type: 'improved',
        title: 'Dashboard görsel iyileştirmeleri',
        desc: 'Banner görseli, renk kartlarına kısa açıklama etiketleri (Biz, M.A.Ö, Y.B vb.) ve tam yükseklik kart düzeni eklendi.',
      },
      {
        type: 'fix',
        title: 'Kayıt sonrası dialog kapanıyor',
        desc: 'Cari kart, ziyaret, kullanıcı, meslek grubu ve satış temsilcisi güncellendikten sonra dialog artık düzenleme modundan çıkmak yerine tamamen kapanıyor.',
      },
    ],
  },
  {
    id: 'v1-15',
    version: '1.15',
    date: '11 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Mor renk varyantı',
        desc: 'Cari kartlarına mor(araf) renk seçeneği eklendi.',
      },
      {
        type: 'new',
        title: 'Excel dışa aktarma',
        desc: 'Tüm tablolara Excel olarak dışa aktarma eklendi.',
      },
      {
        type: 'improved',
        title: 'Girişten sonra cari kartlara yönlendirme',
        desc: "Kullanıcılar giriş yapmanın ardından artık doğrudan cari kartlar sayfasına yönlendiriliyor; giriş anında dashboard'daki role özgü verilerin görünmesinin önüne geçiliyor.",
      },
    ],
  },
  {
    id: 'v1-14',
    version: '1.14',
    date: '10 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Değişiklik günlüğü sayfası ve sürüm rozeti',
        desc: 'Başlık çubuğunun sağ kenarına sürüm rozeti eklendi; yeni sürüm çıktığında kullanıcıya ilk girişinde bilgilendirici bir pop up gösteriliyor.',
      },
      {
        type: 'new',
        title: 'Cari kartlara "Not" alanı',
        desc: 'Cari kartlarına serbest metin girilmesine olanak tanıyan isteğe bağlı bir not alanı eklendi.',
      },
    ],
  },
  {
    id: 'v1-13',
    version: '1.13',
    date: '10 Haziran 2026',
    changes: [
      {
        type: 'new',
        title: 'Meslek grubu renk dağılımında toplam satır sayısı',
        desc: "Dashboard'daki meslek grubu sağlık kartları artık her grupta bulunan cari sayısını gösteriyor.",
      },
      {
        type: 'new',
        title: 'Tabloların alt çubuğunda toplam kayıt sayısı',
        desc: 'Tüm veri tablolarının alt kısmında toplam kayıt sayısı görüntüleniyor.',
      },
      {
        type: 'fix',
        title:
          '"Cariyi Görüntüle" menü başlığı "Cariyi Düzenle" olarak düzeltildi',
      },
    ],
  },
  {
    id: 'v1-12',
    version: '1.12',
    date: '2 Haziran 2026',
    changes: [
      {
        type: 'fix',
        title: 'Eylemler sütunu sabit genişliğe getirildi',
        desc: 'Tüm tablolardaki işlemler ve avatar sütunları 60px olarak sabitlendi; içerik kayması giderildi.',
      },
      {
        type: 'fix',
        title: 'Yönetici olmayan kullanıcının cari filtresi düzeltildi',
        desc: 'Belirli bir meslek grubu seçildiğinde filtrenin yanlış sonuç gösterdiği hata giderildi.',
      },
      {
        type: 'fix',
        title: 'Meslek grubu işlemleri cari kartlara yansıtılıyor',
        desc: 'Bir meslek grubu silindiğinde veya adı değiştirildiğinde bağlı cari kartlar otomatik güncelleniyor; listeler artık alfabetik sıralı.',
      },
      {
        type: 'new',
        title: 'Ziyaret bulunamadığında bildirim',
        desc: 'Bir cariye ait ziyaret kaydı yokken yönlendirme yapıldığında kullanıcıya açıklayıcı bir bildirim gösteriliyor.',
      },
      {
        type: 'improved',
        title: 'Türkçe karakter sıralaması iyileştirildi',
        desc: 'Yerel ayara duyarlı sıralama yardımcısı tüm diyalog, filtre ve yönlendirme bileşenlerine uygulandı.',
      },
    ],
  },
  {
    id: 'v1-11',
    version: '1.11',
    date: '22 Mayıs 2026',
    changes: [
      {
        type: 'new',
        title: 'Sütun genişliği yeniden boyutlandırma',
        desc: 'Tablolardaki sütun genişlikleri sürükle-bırak ile ayarlanabiliyor; tercihler tarayıcıda saklanıyor.',
      },
      {
        type: 'new',
        title: 'Sayfa başına satır seçici ve "Tümünü Getir" seçeneği',
        desc: '"Tümü" seçeneğiyle bir seferde tüm kayıtlar yüklenebiliyor; sayfa başına satır sayısı serbestçe ayarlanabiliyor.',
      },
      {
        type: 'improved',
        title: 'Cari kartı sütunları yeniden düzenlendi',
        desc: 'Sütun sırası güncellendi; renk alanı için görsel gösterim eklendi.',
      },
      {
        type: 'new',
        title: 'Sarı renk varyantı',
        desc: 'Cari kartlarında sarı renk seçeneği kullanıma açıldı.',
      },
    ],
  },
  {
    id: 'v1-10',
    version: '1.10',
    date: '13 Mayıs 2026',
    changes: [
      {
        type: 'improved',
        title: 'Filtre arayüzü iyileştirildi',
        desc: 'Sıfırlama butonu yeniden konumlandırıldı; arama kapsamı genişletildi; varsayılan sütun görünürlükleri optimize edildi.',
      },
      {
        type: 'new',
        title: '"Boş" filtre seçeneği',
        desc: 'Durum, yetki belgesi ve oy alanlarında değer atanmamış kayıtları filtrelemek için "Boş" seçeneği eklendi.',
      },
      {
        type: 'improved',
        title: 'Açılır liste etiket kısaltma',
        desc: "Uzun etiketler combobox'larda artık taşmak yerine düzgünce kısaltılıyor.",
      },
    ],
  },
  {
    id: 'v1-9',
    version: '1.9',
    date: '5 Mayıs 2026',
    changes: [
      {
        type: 'new',
        title: 'Yetki belgesi ve oy alanları',
        desc: 'Cari kartlarına yetki belgesi durumu ve oy alanları eklendi; tabloda filtrelenebilir.',
      },
      {
        type: 'new',
        title: 'Güvenlik aşımı desteği',
        desc: 'Cari kartlarına güvenlik aşımı alanı eklendi.',
      },
    ],
  },
  {
    id: 'v1-8',
    version: '1.8',
    date: '25 Nisan 2026',
    changes: [
      {
        type: 'new',
        title: 'Açık / koyu / sistem teması',
        desc: 'Kullanıcı arayüzüne üç tema seçeneği eklendi; tercih oturum boyunca korunuyor.',
      },
      {
        type: 'new',
        title: 'Kenar çubuğunda kullanıcı profil kartı',
        desc: 'Oturum açık kullanıcının adı, e-postası ve rolü kenar çubuğu altında gösteriliyor.',
      },
      {
        type: 'improved',
        title: 'Dashboard meslek grubuna göre kapsam altına alındı',
        desc: 'Dashboard sayaçları ve ziyaret listesi artık kullanıcının atandığı meslek gruplarına göre filtreleniyor.',
      },
      {
        type: 'new',
        title: 'Yetkililer alanı',
        desc: 'Cari kartlarına birden fazla yetkili girişi destekleyen yetkililer alanı eklendi.',
      },
    ],
  },
  {
    id: 'v1-7',
    version: '1.7',
    date: '14 Nisan 2026',
    changes: [
      {
        type: 'new',
        title: 'Durum alanı ve filtresi',
        desc: 'Cari kartlarına "Geldi / Gelmedi" durum alanı eklendi; tablo filtresinde kullanılabiliyor.',
      },
      {
        type: 'improved',
        title: 'Veritabanı sorgu performansı',
        desc: 'Yönlendirici sorguları paralel hale getirildi; sayfa yükleme sürelerinde iyileşme sağlandı.',
      },
    ],
  },
  {
    id: 'v1-6',
    version: '1.6',
    date: '1 Nisan 2026',
    changes: [
      {
        type: 'new',
        title: 'Renk sistemi ve meslek grubu sağlık uyarıları',
        desc: "Cari kartları artık yeşil, mavi, turuncu ve gri renk etiketleri destekliyor. Dashboard'a meslek grubu renk dağılımı eklendi.",
      },
      {
        type: 'changed',
        title: '"Pozitif Kontrol" alanı "Renk" olarak yeniden adlandırıldı',
        desc: 'Mevcut veriler otomatik olarak taşındı.',
      },
    ],
  },
  {
    id: 'v1-5',
    version: '1.5',
    date: '20 Mart 2026',
    changes: [
      {
        type: 'new',
        title: 'Rol tabanlı erişim kontrolü',
        desc: 'Kullanıcılar artık meslek gruplarına atanabiliyor; yönetici ve standart kullanıcı rolleri ayrı yetki setleriyle tanımlandı.',
      },
      {
        type: 'new',
        title: 'Silme işlemleri yöneticiye kısıtlandı',
        desc: 'Cari kart ve ziyaret silme işlemleri artık yalnızca yöneticiler tarafından gerçekleştirilebiliyor.',
      },
      {
        type: 'improved',
        title: 'Arayüz yeniden tasarımı',
        desc: 'Tüm panel sayfaları daha tutarlı bir tasarım diline kavuştu.',
      },
    ],
  },
];
