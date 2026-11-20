package expo.modules.smsreader

/**
 * Cheap checks shared by the inbox reader and the receiver. They only keep personal and promotional
 * messages out; the real parsing happens in JavaScript (src/lib/sms/parser.ts).
 */
object SmsFilter {
  private val dlt = Regex("^[A-Za-z]{2}-[A-Za-z0-9]{3,9}(-[STGstg])?$")
  private val promotional = Regex("^[A-Za-z]{2}-[A-Za-z0-9]{3,9}-[Pp]$")
  private val phone = Regex("^\\+?[0-9][0-9\\s-]{5,}$")
  private val amount = Regex("(?i)(?:₹|\\brs\\.?|\\binr)\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)")
  private val verb = Regex("(?i)\\b(debited|credited|spent|paid|sent|received|withdrawn|refunded|reversed)\\b")
  private val skip = Regex("(?i)\\b(otp|one time password|verification code|will be debited|failed|declined|requested|statement)\\b")

  /** A bank or business sender, never a person's phone number or a promotional header. */
  fun isBusinessSender(address: String?): Boolean {
    val value = address?.trim() ?: return false
    if (value.isEmpty() || phone.matches(value) || promotional.matches(value)) return false
    return dlt.matches(value) || value.any { it.isLetter() }
  }

  /** The registered header of a DLT sender ("VM-HDFCBK-S" → "HDFCBK"), for the notification text. */
  fun senderLabel(address: String): String {
    val parts = address.trim().uppercase().split('-')
    return if (parts.size >= 2 && dlt.matches(address.trim())) parts[1] else address.trim()
  }

  data class Alert(val amount: String, val verb: String)

  /** Amount and verb for a "₹450.00 debited" notification, or null if this doesn't look like a completed transaction. */
  fun alertFor(body: String): Alert? {
    if (skip.containsMatchIn(body)) return null
    val v = verb.find(body) ?: return null
    val a = amount.findAll(body).minByOrNull { kotlin.math.abs(it.range.first - v.range.first) } ?: return null
    return Alert(a.groupValues[1], v.value.lowercase())
  }
}
