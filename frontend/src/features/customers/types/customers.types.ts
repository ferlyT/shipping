export interface CustomerAddress {
  fdID: string
  fdJenis: string
  fdContact: string
  fdHP: string
  fdTelp: string
  fdEmail: string
  fdAddr: string
  fdCity: string
  fdAktif: number
}

export interface Customer {
  fdCustCode: string
  fdCustName: string
  fdContact: string
  fdAddr1: string
  fdCityName: string
  fdTelp: string
  fdHP: string
  fdFax: string
  fdEmail: string
  fdSalesNM: string
  fdCreatedDate: string | null
  fdBroker: number
  fdBlocked: number
  fdDiscontinued: number
  fdKeterangan: string
  fdNamaPengiriman: string
  fdHpPengiriman: string
  fdAlamatPengiriman: string
  fdKetPengiriman: string
  fdKotaPengiriman: string
  fdHpPenagihan: string
  fdEmailPenagihan: string
  fdNotifPenagihan: number
  fdKeteranganPenagihan: string
  addresses?: CustomerAddress[]
}

export type CustomerStatusKey = 0 | 1 | 2 | 3 | 4 | 5
