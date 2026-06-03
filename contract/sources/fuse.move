module fuse::fuse {
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::String;

    // ── State constants ──────────────────────────────────────────────
    const ALIVE:            u8 = 0;
    const DORMANT:          u8 = 1;
    const SETTLED_REVEAL:   u8 = 2;
    const SETTLED_BURN:     u8 = 3;

    // ── Condition type constants ─────────────────────────────────────
    const COND_PING:        u8 = 0;
    const COND_DATE:        u8 = 1;
    const COND_GUARDIAN:    u8 = 2;
    const COND_WALLET:      u8 = 3;
    const COND_COMBINED:    u8 = 4;

    // ── Rule constants ───────────────────────────────────────────────
    const RULE_REVEAL:      u8 = 0;
    const RULE_BURN:        u8 = 1;

    // ── Errors ───────────────────────────────────────────────────────
    const ENotOwner:        u64 = 0;
    const ENotAlive:        u64 = 1;
    const EStillAlive:      u64 = 2;
    const EGracePending:    u64 = 3;
    const EAlreadySettled:  u64 = 4;
    const ENotGuardian:     u64 = 5;
    const EAlreadyConfirmed: u64 = 6;

    // ── Core vault object ────────────────────────────────────────────
    public struct Vault has key, store {
        id: UID,
        owner:              address,
        heir:               address,
        blob_id:            String,       // Walrus blob reference
        seal_policy_id:     Option<ID>,   // Seal access policy
        condition_type:     u8,
        interval_ms:        u64,          // ping interval in ms
        grace_ms:           u64,          // grace period after deadline
        fire_date_ms:       u64,          // for DATE_LOCK condition
        trigger_wallet:     Option<address>, // for WALLET_TRIGGER
        guardians:          vector<address>, // for GUARDIAN_CONFIRM
        guardian_threshold: u64,
        guardian_confirms:  vector<address>,
        rule:               u8,           // REVEAL or BURN
        state:              u8,
        last_checkin_ms:    u64,
        delivery_method:    String,       // "gmail" | "sms" | "wallet"
        heir_contact:       String,       // email or phone
        condition_label:    String,       // human readable condition
    }

    // ── Capability for admin actions ─────────────────────────────────
    public struct FuseAdmin has key { id: UID }

    // ── Events ───────────────────────────────────────────────────────
    public struct VaultCreated has copy, drop {
        vault_id:       ID,
        owner:          address,
        heir:           address,
        condition_type: u8,
        rule:           u8,
    }

    public struct CheckedIn has copy, drop {
        vault_id:       ID,
        owner:          address,
        timestamp_ms:   u64,
    }

    public struct WentDormant has copy, drop {
        vault_id:       ID,
        triggered_by:   address,
        timestamp_ms:   u64,
    }

    public struct Settled has copy, drop {
        vault_id:       ID,
        rule:           u8,
        heir:           address,
        timestamp_ms:   u64,
    }

    public struct GuardianConfirmed has copy, drop {
        vault_id:       ID,
        guardian:       address,
        confirms_so_far: u64,
    }

    public struct WalletTriggered has copy, drop {
        vault_id:       ID,
        trigger_wallet: address,
        timestamp_ms:   u64,
    }

    // ── Init ─────────────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::transfer(FuseAdmin { id: object::new(ctx) }, ctx.sender());
    }

    // ── Create vault ─────────────────────────────────────────────────
    public entry fun create_vault(
        blob_id:            String,
        heir:               address,
        delivery_method:    String,
        heir_contact:       String,
        condition_type:     u8,
        interval_ms:        u64,
        grace_ms:           u64,
        fire_date_ms:       u64,
        trigger_wallet_opt: Option<address>,
        guardians:          vector<address>,
        guardian_threshold: u64,
        rule:               u8,
        condition_label:    String,
        clock:              &Clock,
        ctx:                &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        let vault = Vault {
            id:                 object::new(ctx),
            owner:              ctx.sender(),
            heir,
            blob_id,
            seal_policy_id:     option::none(),
            condition_type,
            interval_ms,
            grace_ms,
            fire_date_ms,
            trigger_wallet:     trigger_wallet_opt,
            guardians,
            guardian_threshold,
            guardian_confirms:  vector::empty(),
            rule,
            state:              ALIVE,
            last_checkin_ms:    now,
            delivery_method,
            heir_contact,
            condition_label,
        };

        event::emit(VaultCreated {
            vault_id:       object::id(&vault),
            owner:          ctx.sender(),
            heir,
            condition_type,
            rule,
        });

        transfer::share_object(vault);
    }

    // ── Check in (ping response) ──────────────────────────────────────
    public entry fun check_in(vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        assert!(vault.owner == ctx.sender(), ENotOwner);
        assert!(vault.state == ALIVE, ENotAlive);
        vault.last_checkin_ms = clock::timestamp_ms(clock);

        event::emit(CheckedIn {
            vault_id:     object::id(vault),
            owner:        ctx.sender(),
            timestamp_ms: vault.last_checkin_ms,
        });
    }

    // ── Mark dormant (anyone can call when deadline passed) ───────────
    public entry fun mark_dormant(vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        assert!(vault.state == ALIVE, ENotAlive);
        let now = clock::timestamp_ms(clock);

        let deadline_passed = if (vault.condition_type == COND_PING) {
            now > vault.last_checkin_ms + vault.interval_ms
        } else if (vault.condition_type == COND_DATE) {
            now >= vault.fire_date_ms
        } else {
            false
        };

        assert!(deadline_passed, EStillAlive);
        vault.state = DORMANT;

        event::emit(WentDormant {
            vault_id:     object::id(vault),
            triggered_by: ctx.sender(),
            timestamp_ms: now,
        });
    }

    // ── Settle (fires the vault) ──────────────────────────────────────
    public entry fun settle(vault: &mut Vault, clock: &Clock, _ctx: &mut TxContext) {
        assert!(vault.state == DORMANT, EAlreadySettled);
        let now = clock::timestamp_ms(clock);
        let dormant_since = vault.last_checkin_ms + vault.interval_ms;
        assert!(now > dormant_since + vault.grace_ms, EGracePending);

        vault.state = if (vault.rule == RULE_REVEAL) { SETTLED_REVEAL } else { SETTLED_BURN };

        event::emit(Settled {
            vault_id:     object::id(vault),
            rule:         vault.rule,
            heir:         vault.heir,
            timestamp_ms: now,
        });
    }

    // ── Guardian confirm ─────────────────────────────────────────────
    public entry fun guardian_confirm(vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        assert!(vault.condition_type == COND_GUARDIAN, ENotGuardian);
        assert!(vault.state == ALIVE, ENotAlive);

        let caller = ctx.sender();
        assert!(vector::contains(&vault.guardians, &caller), ENotGuardian);
        assert!(!vector::contains(&vault.guardian_confirms, &caller), EAlreadyConfirmed);

        vector::push_back(&mut vault.guardian_confirms, caller);

        let confirms = vector::length(&vault.guardian_confirms);
        event::emit(GuardianConfirmed {
            vault_id:        object::id(vault),
            guardian:        caller,
            confirms_so_far: confirms,
        });

        // Auto-settle if threshold reached
        if ((confirms as u64) >= vault.guardian_threshold) {
            vault.state = DORMANT;
            let now = clock::timestamp_ms(clock);
            event::emit(WentDormant {
                vault_id:     object::id(vault),
                triggered_by: caller,
                timestamp_ms: now,
            });
        }
    }

    // ── Wallet trigger ───────────────────────────────────────────────
    public entry fun wallet_trigger(vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        assert!(vault.condition_type == COND_WALLET, ENotGuardian);
        assert!(vault.state == ALIVE, ENotAlive);

        let caller = ctx.sender();
        let trigger = option::borrow(&vault.trigger_wallet);
        assert!(*trigger == caller, ENotGuardian);

        let now = clock::timestamp_ms(clock);
        vault.state = DORMANT;

        event::emit(WalletTriggered {
            vault_id:       object::id(vault),
            trigger_wallet: caller,
            timestamp_ms:   now,
        });
    }

    // ── Set Seal policy (owner only) ─────────────────────────────────
    public entry fun set_seal_policy(vault: &mut Vault, policy_id: ID, ctx: &mut TxContext) {
        assert!(vault.owner == ctx.sender(), ENotOwner);
        vault.seal_policy_id = option::some(policy_id);
    }

    // ── View helpers ─────────────────────────────────────────────────
    public fun is_unlockable(vault: &Vault): bool {
        vault.state == SETTLED_REVEAL
    }

    public fun state(vault: &Vault): u8 { vault.state }
    public fun owner(vault: &Vault): address { vault.owner }
    public fun heir(vault: &Vault): address { vault.heir }
    public fun blob_id(vault: &Vault): &String { &vault.blob_id }
    public fun condition_type(vault: &Vault): u8 { vault.condition_type }
    public fun rule(vault: &Vault): u8 { vault.rule }
    public fun last_checkin_ms(vault: &Vault): u64 { vault.last_checkin_ms }
    public fun interval_ms(vault: &Vault): u64 { vault.interval_ms }
    public fun guardian_confirms(vault: &Vault): u64 {
        vector::length(&vault.guardian_confirms)
    }
}
