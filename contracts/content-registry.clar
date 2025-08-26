;; Educational Content Registry Contract
;; Manages intellectual property rights and content metadata

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-CONTENT-NOT-FOUND (err u404))
(define-constant ERR-INVALID-INPUT (err u400))
(define-constant ERR-ALREADY-EXISTS (err u409))

;; Data Variables
(define-data-var next-content-id uint u1)

;; Data Maps
(define-map content-registry
  { content-id: uint }
  {
    title: (string-ascii 256),
    description: (string-ascii 1024),
    creator: principal,
    price: uint,
    royalty-percentage: uint,
    created-at: uint,
    is-active: bool,
    license-type: (string-ascii 64),
    category: (string-ascii 128)
  }
)

(define-map content-ownership
  { creator: principal, content-id: uint }
  { owned: bool }
)

(define-map content-licenses
  { content-id: uint, licensee: principal }
  {
    license-start: uint,
    license-end: uint,
    usage-limit: uint,
    usage-count: uint,
    is-active: bool
  }
)

;; Public Functions

;; Register new educational content
(define-public (register-content
  (title (string-ascii 256))
  (description (string-ascii 1024))
  (price uint)
  (royalty-percentage uint))
  (let ((content-id (var-get next-content-id)))
    (asserts! (> (len title) u0) ERR-INVALID-INPUT)
    (asserts! (> (len description) u0) ERR-INVALID-INPUT)
    (asserts! (<= royalty-percentage u100) ERR-INVALID-INPUT)

    (map-set content-registry
      { content-id: content-id }
      {
        title: title,
        description: description,
        creator: tx-sender,
        price: price,
        royalty-percentage: royalty-percentage,
        created-at: block-height,
        is-active: true,
        license-type: "standard",
        category: "general"
      }
    )

    (map-set content-ownership
      { creator: tx-sender, content-id: content-id }
      { owned: true }
    )

    (var-set next-content-id (+ content-id u1))
    (ok content-id)
  )
)

;; Purchase content license
(define-public (purchase-license (content-id uint) (duration uint))
  (let ((content (unwrap! (map-get? content-registry { content-id: content-id }) ERR-CONTENT-NOT-FOUND)))
    (asserts! (get is-active content) ERR-INVALID-INPUT)
    (asserts! (> duration u0) ERR-INVALID-INPUT)

    (map-set content-licenses
      { content-id: content-id, licensee: tx-sender }
      {
        license-start: block-height,
        license-end: (+ block-height duration),
        usage-limit: u1000,
        usage-count: u0,
        is-active: true
      }
    )
    (ok true)
  )
)

;; Update content metadata (creator only)
(define-public (update-content
  (content-id uint)
  (title (string-ascii 256))
  (description (string-ascii 1024))
  (price uint))
  (let ((content (unwrap! (map-get? content-registry { content-id: content-id }) ERR-CONTENT-NOT-FOUND)))
    (asserts! (is-eq (get creator content) tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (> (len title) u0) ERR-INVALID-INPUT)

    (map-set content-registry
      { content-id: content-id }
      (merge content {
        title: title,
        description: description,
        price: price
      })
    )
    (ok true)
  )
)

;; Deactivate content (creator only)
(define-public (deactivate-content (content-id uint))
  (let ((content (unwrap! (map-get? content-registry { content-id: content-id }) ERR-CONTENT-NOT-FOUND)))
    (asserts! (is-eq (get creator content) tx-sender) ERR-NOT-AUTHORIZED)

    (map-set content-registry
      { content-id: content-id }
      (merge content { is-active: false })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get content details
(define-read-only (get-content (content-id uint))
  (map-get? content-registry { content-id: content-id })
)

;; Check if user has valid license
(define-read-only (has-valid-license (content-id uint) (user principal))
  (match (map-get? content-licenses { content-id: content-id, licensee: user })
    license (and
      (get is-active license)
      (>= (get license-end license) block-height)
      (< (get usage-count license) (get usage-limit license))
    )
    false
  )
)

;; Get content creator
(define-read-only (get-content-creator (content-id uint))
  (match (map-get? content-registry { content-id: content-id })
    content (some (get creator content))
    none
  )
)

;; Check content ownership
(define-read-only (is-content-owner (creator principal) (content-id uint))
  (default-to false (get owned (map-get? content-ownership { creator: creator, content-id: content-id })))
)

;; Get next content ID
(define-read-only (get-next-content-id)
  (var-get next-content-id)
)
