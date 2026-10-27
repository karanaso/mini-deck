import type { EnglishDictionary } from "./en";

export const el: EnglishDictionary = {
  // Common actions and labels
  "common.allDecks": "Όλα τα deck",
  "common.backToMiniDeck": "Επιστροφή στο Mini Deck",
  "common.cancel": "Άκυρο",
  "common.close": "Κλείσιμο",
  "common.copied": "Αντιγράφηκε",
  "common.copy": "Αντιγραφή",
  "common.delete": "Διαγραφή",
  "common.download": "Λήψη",
  "common.duplicate": "Διπλότυπο",
  "common.export": "Εξαγωγή",
  "common.language": "Γλώσσα",
  "common.present": "Παρουσίαση",
  "common.share": "Κοινοποίηση",
  "common.shortcuts": "Συντομεύσεις",
  "common.tryAgain": "Δοκίμασε ξανά",
  "common.viewOnly": "Μόνο προβολή",

  // Landing
  "landing.tagline": "Μικρά deck, ζωντανά μαζί",
  "landing.noAccount": "Χωρίς λογαριασμό",
  "landing.badge": "Ένα μικρό deck για μια μεγάλη ιδέα",
  "landing.hero.line1": "Φτιάξε ένα deck.",
  "landing.hero.line2": "Στείλε έναν σύνδεσμο.",
  "landing.hero.line3": "Χτίσε το μαζί.",
  "landing.hero.body":
    "Το Mini Deck είναι ένας επεξεργαστής διαφανειών που ξεκινά από έναν σύνδεσμο, για γρήγορες ιδέες. Πρόσθεσε κείμενο, πλαίσια, βέλη και εικόνες και μετά κάλεσε άλλους να επεξεργαστούν ή να δουν — χωρίς εγγραφές, συνημμένα ή τηλεδιάσκεψη.",
  "landing.create": "Νέο deck",
  "landing.creating": "Δημιουργία…",
  "landing.createHint": "Ξεκινά κενό. Ανοίγει αμέσως.",
  "landing.mockup.editing.one": "{count} σε επεξεργασία",
  "landing.mockup.editing.other": "{count} σε επεξεργασία",
  "landing.mockup.eyebrow": "Κατεύθυνση προϊόντος",
  "landing.mockup.title": "Ένα deck που μοιάζει με συζήτηση.",
  "landing.mockup.oneLink": "Ένας σύνδεσμος",
  "landing.mockup.liveCursors": "Ζωντανοί δείκτες",
  "landing.mockup.exports": "PNG + PDF",
  "landing.mockup.untitled": "Deck χωρίς τίτλο",
  "landing.mockup.slideMeta": "16:9 · Διαφάνεια {number}",
  "landing.features.link.title": "Κοινοποίηση μόνο με σύνδεσμο",
  "landing.features.link.body":
    "Στείλε έναν σύνδεσμο επεξεργασίας ή έναν σύνδεσμο προβολής μόνο για ανάγνωση. Χωρίς προσκλήσεις, χωρίς λογαριασμούς.",
  "landing.features.export.title": "Παρουσίαση και εξαγωγή",
  "landing.features.export.body":
    "Προβάλε σε πλήρη οθόνη ή πάρε το deck μαζί σου ως PNG και PDF.",
  "landing.features.live.title": "Ζωντανό από προεπιλογή",
  "landing.features.live.body":
    "Οι δείκτες, οι επιλογές και οι αλλαγές εμφανίζονται καθώς συνεργάζεσαι.",
  "landing.recent.eyebrow": "Σε αυτή τη συσκευή",
  "landing.recent.title": "Πρόσφατα deck",
  "landing.recent.stored": "Αποθηκεύονται μόνο σε αυτό το πρόγραμμα περιήγησης",
  "landing.recent.empty.title": "Δεν υπάρχουν ακόμη deck",
  "landing.recent.empty.body":
    "Δημιούργησε το πρώτο σου deck και θα εμφανιστεί εδώ. Αν ανοίξεις έναν σύνδεσμο επεξεργασίας σε αυτό το πρόγραμμα περιήγησης, θα προστεθεί κι αυτός.",
  "landing.recent.open": "Άνοιγμα {title}",
  "landing.recent.remove": "Αφαίρεση {title} από τα πρόσφατα",
  "landing.recent.removed": "Αφαιρέθηκε από αυτή τη συσκευή",
  "landing.createError": "Δεν ήταν δυνατή η δημιουργία deck",
  "landing.footer.tagline": "Mini Deck · ελαφριές διαφάνειες για γρήγορες ιδέες",
  "landing.footer.warning":
    "Όποιος έχει σύνδεσμο επεξεργασίας μπορεί να επεξεργαστεί. Αντιμετώπισε τους συνδέσμους ως μυστικά.",

  // Deck shell and error pages
  "deckShell.opening": "Άνοιγμα deck…",
  "deckShell.invalid.title": "Αυτός ο σύνδεσμος δεν μπορεί να ανοίξει το deck",
  "deckShell.invalid.body":
    "Ο σύνδεσμος μπορεί να είναι ελλιπής, λανθασμένος ή να μην ισχύει πλέον. Αντέγραψε ολόκληρο τον σύνδεσμο, μαζί με ό,τι ακολουθεί το σύμβολο #.",
  "deckShell.error.title": "Δεν μπορέσαμε να ανοίξουμε το deck",
  "deckShell.error.body":
    "Δεν ήταν δυνατή η πρόσβαση στο deck. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.",
  "deckShell.loadingSlides": "Φόρτωση διαφανειών…",
  "deckShell.syncing": "Συγχρονισμός του deck…",
  "deckShell.reconnecting": "Επανασύνδεση στη ζωντανή συνεδρία…",
  "deckShell.syncHint":
    "Μπορείς να συνεχίσεις μόλις είναι έτοιμη η σύνδεση.",
  "deckShell.notFound.eyebrow": "Δεν βρέθηκε",
  "deckShell.notFound.title": "Αυτό το deck δεν είναι διαθέσιμο",
  "deckShell.notFound.body":
    "Ο σύνδεσμος μπορεί να είναι ελλιπής ή να μην ισχύει πλέον. Βεβαιώσου ότι αντέγραψες ολόκληρο τον σύνδεσμο, μαζί με ό,τι ακολουθεί το σύμβολο #.",
  "deckShell.errorPage.eyebrow": "Κάτι πήγε στραβά",
  "deckShell.errorPage.title": "Το deck αντιμετώπισε ένα απρόσμενο σφάλμα",
  "deckShell.errorPage.body":
    "Η εργασία σου αποθηκεύεται αυτόματα στον διακομιστή συνεργασίας. Δοκίμασε να φορτώσεις ξανά την προβολή ή επέστρεψε στην αρχική σελίδα.",

  // Editor top bar and connection state
  "editor.backToAllDecks": "Επιστροφή σε όλα τα deck",
  "editor.deckTitle": "Τίτλος deck",
  "editor.presence.you": "εσύ",
  "editor.presence.youTooltip": "{name} (εσύ)",
  "editor.presence.rename": "{name} (εσύ) — μετονομασία",
  "editor.connection.live": "Ζωντανά",
  "editor.connection.syncing": "Συγχρονισμός",
  "editor.connection.connecting": "Σύνδεση",
  "editor.connection.offline": "Εκτός σύνδεσης",

  // Keyboard shortcuts
  "editor.shortcuts.title": "Συντομεύσεις πληκτρολογίου",
  "editor.shortcuts.description":
    "Οι συντομεύσεις επεξεργασίας απενεργοποιούνται όταν πληκτρολογείς σε πεδίο κειμένου.",
  "editor.shortcuts.selectMove": "Επιλογή / μετακίνηση",
  "editor.shortcuts.selectMoveKeys": "V, μετά σύρε",
  "editor.shortcuts.text": "Κείμενο",
  "editor.shortcuts.textKeys": "T, μετά κλικ",
  "editor.shortcuts.shapes": "Ορθογώνιο / έλλειψη / βέλος / γραμμή",
  "editor.shortcuts.shapesKeys":
    "R / O / A / L, μετά σύρε· περισσότερα σχήματα στο μενού σχημάτων",
  "editor.shortcuts.duplicate": "Διπλότυπο",
  "editor.shortcuts.clipboard": "Αντιγραφή / αποκοπή / επικόλληση",
  "editor.shortcuts.undoRedo": "Αναίρεση / επανάληψη",
  "editor.shortcuts.nudge": "Μετακίνηση κατά βήμα",
  "editor.shortcuts.nudgeKeys": "Βέλη (Shift = 10px)",
  "editor.shortcuts.slideNavigation": "Προηγούμενη / επόμενη διαφάνεια",
  "editor.shortcuts.present": "Παρουσίαση",
  "editor.shortcuts.presentKeys":
    "Χρησιμοποίησε το κουμπί Παρουσίαση και μετά τα βέλη",

  // Export
  "editor.export.currentSlidePng": "Τρέχουσα διαφάνεια ως PNG",
  "editor.export.allSlidesPdf": "Όλες οι διαφάνειες ως PDF",
  "editor.export.exporting": "Εξαγωγή {kind}",
  "editor.export.exportingWithProgress": "Εξαγωγή {kind} {completed}/{total}",
  "editor.export.pngDownloaded": "Το PNG κατέβηκε",
  "editor.export.pdfDownloaded": "Το PDF κατέβηκε",
  "editor.export.pngError": "Δεν ήταν δυνατή η εξαγωγή του PNG",
  "editor.export.pdfError": "Δεν ήταν δυνατή η εξαγωγή του PDF",

  // Slides
  "editor.slides": "Διαφάνειες",
  "editor.addSlide": "Προσθήκη διαφάνειας",
  "editor.duplicateSlide": "Διπλότυπη διαφάνεια",
  "editor.deleteSlide": "Διαγραφή διαφάνειας",
  "editor.goToSlide": "Μετάβαση στη διαφάνεια {number}",
  "editor.slideDeleted": "Η διαφάνεια διαγράφηκε",
  "editor.lastSlideError": "Ένα deck χρειάζεται τουλάχιστον μία διαφάνεια",
  "editor.addSlideError": "Δεν ήταν δυνατή η προσθήκη διαφάνειας",
  "editor.duplicateSlideError":
    "Δεν ήταν δυνατός ο διπλασιασμός της διαφάνειας",
  "editor.deleteSlideError": "Δεν ήταν δυνατή η διαγραφή της διαφάνειας",

  // Toolbar and style panel
  "editor.tools.select": "Επιλογή (V)",
  "editor.tools.text": "Κείμενο (T)",
  "editor.tools.rectangle": "Ορθογώνιο (R)",
  "editor.tools.ellipse": "Έλλειψη (O)",
  "editor.tools.arrow": "Βέλος (A)",
  "editor.tools.shapes": "Σχήματα",
  "editor.tools.emoji": "Emoji",
  "editor.tools.addImage": "Προσθήκη εικόνας",
  "editor.tools.undo": "Αναίρεση (⌘Z)",
  "editor.tools.redo": "Επανάληψη (⇧⌘Z)",
  "editor.style.heading": "Στυλ",
  "editor.style.nothingSelected": "Καμία επιλογή",
  "editor.style.selectedElements.one": "{count} στοιχείο",
  "editor.style.selectedElements.other": "{count} στοιχεία",
  "editor.style.selectElement": "Επίλεξε ένα στοιχείο",
  "editor.style.selectElementHelp":
    "Κάνε κλικ σε ένα στοιχείο στη διαφάνεια για να αλλάξεις το χρώμα, το μέγεθος ή τη σειρά του.",
  "editor.style.textColor": "Χρώμα κειμένου",
  "editor.style.fill": "Γέμισμα",
  "editor.style.stroke": "Περίγραμμα",
  "editor.style.strokeWidth": "Πάχος περιγράμματος",
  "editor.style.cornerRadius": "Ακτίνα γωνιών",
  "editor.style.fontSize": "Μέγεθος γραμματοσειράς",
  "editor.style.alignment": "Στοίχιση",
  "editor.style.rotation": "Περιστροφή",
  "editor.style.opacity": "Αδιαφάνεια",
  "editor.style.arrange": "Διάταξη",
  "editor.style.sendToBack": "Στο πίσω μέρος",
  "editor.style.sendBackward": "Προς τα πίσω",
  "editor.style.bringForward": "Προς τα εμπρός",
  "editor.style.bringToFront": "Στο μπροστινό μέρος",
  "editor.style.alignLeft": "Στοίχιση αριστερά",
  "editor.style.alignCenter": "Στοίχιση στο κέντρο",
  "editor.style.alignRight": "Στοίχιση δεξιά",
  "editor.style.types.text": "Κείμενο",
  "editor.style.types.rect": "Ορθογώνιο",
  "editor.style.types.ellipse": "Έλλειψη",
  "editor.style.types.arrow": "Βέλος",
  "editor.style.types.image": "Εικόνα",
  "editor.style.types.shape": "Σχήμα",
  "editor.style.types.line": "Γραμμή",
  "editor.style.elementDuplicated": "Το στοιχείο διπλασιάστηκε",
  "editor.style.elementsDuplicated": "Τα στοιχεία διπλασιάστηκαν",
  "editor.style.duplicateError": "Δεν ήταν δυνατός ο διπλασιασμός",
  "editor.style.deleteError": "Δεν ήταν δυνατή η διαγραφή",

  // Shape library
  "editor.shapes.triangle": "Τρίγωνο",
  "editor.shapes.diamond": "Ρόμβος",
  "editor.shapes.parallelogram": "Παραλληλόγραμμο",
  "editor.shapes.trapezoid": "Τραπέζιο",
  "editor.shapes.pentagon": "Πεντάγωνο",
  "editor.shapes.hexagon": "Εξάγωνο",
  "editor.shapes.star": "Αστέρι",
  "editor.shapes.line": "Γραμμή (L)",

  // Emoji picker
  "editor.emoji.heading": "Εισαγωγή emoji",
  "editor.emoji.insert": "Εισαγωγή: {name}",
  "editor.emoji.inserted": "Το emoji προστέθηκε",
  "editor.emoji.categories.smileys": "Εκφράσεις",
  "editor.emoji.categories.people": "Άνθρωποι & χειρονομίες",
  "editor.emoji.categories.nature": "Φύση",
  "editor.emoji.categories.objects": "Αντικείμενα & σύμβολα",
  "editor.emoji.names.grin": "Χαμογελαστό πρόσωπο",
  "editor.emoji.names.joy": "Πρόσωπο με δάκρυα χαράς",
  "editor.emoji.names.smile": "Χαρούμενο πρόσωπο",
  "editor.emoji.names.heartEyes": "Πρόσωπο με καρδούλες στα μάτια",
  "editor.emoji.names.wink": "Πρόσωπο που κλείνει το μάτι",
  "editor.emoji.names.thinking": "Σκεφτικό πρόσωπο",
  "editor.emoji.names.party": "Πρόσωπο σε γιορτή",
  "editor.emoji.names.cool": "Πρόσωπο με γυαλιά ηλίου",
  "editor.emoji.names.wave": "Χέρι που χαιρετά",
  "editor.emoji.names.thumbsUp": "Σηκωμένος αντίχειρας",
  "editor.emoji.names.thumbsDown": "Χαμηλωμένος αντίχειρας",
  "editor.emoji.names.clap": "Χειροκρότημα",
  "editor.emoji.names.pray": "Διπλωμένα χέρια",
  "editor.emoji.names.muscle": "Λυγισμένο μπράτσο",
  "editor.emoji.names.pointRight": "Χέρι που δείχνει δεξιά",
  "editor.emoji.names.handshake": "Χειραψία",
  "editor.emoji.names.sun": "Ήλιος",
  "editor.emoji.names.moon": "Ημισέληνος",
  "editor.emoji.names.star": "Αστέρι",
  "editor.emoji.names.fire": "Φωτιά",
  "editor.emoji.names.leaf": "Φύλλο",
  "editor.emoji.names.flower": "Λουλούδι",
  "editor.emoji.names.rainbow": "Ουράνιο τόξο",
  "editor.emoji.names.turtle": "Χελώνα",
  "editor.emoji.names.lightbulb": "Λαμπτήρας",
  "editor.emoji.names.check": "Σημάδι επιλογής",
  "editor.emoji.names.cross": "Σημάδι απόρριψης",
  "editor.emoji.names.warning": "Προειδοποίηση",
  "editor.emoji.names.heart": "Κόκκινη καρδιά",
  "editor.emoji.names.gem": "Πολύτιμος λίθος",
  "editor.emoji.names.gift": "Δώρο",
  "editor.emoji.names.balloon": "Μπαλόνι",

  // Zoom
  "editor.zoom.out": "Σμίκρυνση",
  "editor.zoom.in": "Μεγέθυνση",
  "editor.zoom.fit": "Προσαρμογή διαφάνειας",

  // Editor feedback
  "editor.readOnly": "Αυτό το deck είναι μόνο για ανάγνωση",
  "editor.displayNameUpdated": "Το όνομα εμφάνισης ενημερώθηκε",
  "editor.imageAdded": "Η εικόνα προστέθηκε",
  "editor.imageAddError": "Δεν ήταν δυνατή η προσθήκη της εικόνας",
  "editor.elementAddError": "Δεν ήταν δυνατή η προσθήκη του στοιχείου",
  "editor.textAddError": "Δεν ήταν δυνατή η προσθήκη του κειμένου",
  "editor.cut": "Αποκόπηκε",
  "editor.pastedElement": "Επικολλήθηκε στοιχείο",
  "editor.pastedElements": "Επικολλήθηκαν {count} στοιχεία",
  "editor.pastedImage": "Η εικόνα επικολλήθηκε",
  "editor.pastedText": "Το κείμενο επικολλήθηκε",
  "editor.pasteError": "Δεν ήταν δυνατή η επικόλληση",
  "editor.pasteImageError": "Δεν ήταν δυνατή η επικόλληση της εικόνας",
  "editor.pasteTextError": "Δεν ήταν δυνατή η επικόλληση του κειμένου",
  "editor.duplicated": "Διπλασιάστηκε",

  // Share dialog
  "share.title": "Κοινοποίηση αυτού του deck",
  "share.description":
    "Στείλε οποιονδήποτε από τους δύο συνδέσμους. Δεν απαιτείται λογαριασμός ή πρόσκληση.",
  "share.editLink": "Σύνδεσμος επεξεργασίας",
  "share.editLinkDescription":
    "Μπορεί να επεξεργαστεί, να παρουσιάσει, να εξαγάγει και να κοινοποιήσει.",
  "share.viewLink": "Σύνδεσμος προβολής",
  "share.viewLinkDescription":
    "Μπορεί να δει, να παρουσιάσει και να εξαγάγει. Μόνο για ανάγνωση.",
  "share.editLinkCopied": "Ο σύνδεσμος επεξεργασίας αντιγράφηκε",
  "share.viewLinkCopied": "Ο σύνδεσμος προβολής αντιγράφηκε",
  "share.error":
    "Δεν ήταν δυνατή η δημιουργία των συνδέσμων κοινοποίησης",
  "share.warning":
    "Όποιος έχει έναν σύνδεσμο μπορεί να αποκτήσει πρόσβαση στο deck χωρίς να συνδεθεί. Οι σύνδεσμοι επεξεργασίας είναι μυστικά και δεν μπορούν να ανακληθούν σε αυτή την έκδοση — κοινοποίησέ τους με προσοχή.",
  "share.editUrlLabel": "URL συνδέσμου επεξεργασίας",
  "share.viewUrlLabel": "URL συνδέσμου προβολής",

  // Participant dialog
  "participant.title": "Το όνομα εμφάνισής σου",
  "participant.description":
    "Οι άλλοι βλέπουν αυτό το όνομα δίπλα στον δείκτη και στις επιλογές σου.",
  "participant.label": "Όνομα εμφάνισης",
  "participant.save": "Αποθήκευση ονόματος",

  // Presentation
  "presentation.exit": "Έξοδος από την παρουσίαση",
  "presentation.previousSlide": "Προηγούμενη διαφάνεια",
  "presentation.nextSlide": "Επόμενη διαφάνεια",
  "presentation.help":
    "Χρησιμοποίησε τα βέλη ή το Space για πλοήγηση · Esc για έξοδο",

  // API and operation errors
  "errors.api.generic": "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
  "errors.api.network":
    "Δεν ήταν δυνατή η σύνδεση. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.",
  "errors.api.rate_limited": "Πολλές προσπάθειες. Δοκίμασε ξανά σύντομα.",
  "errors.api.not_found": "Δεν ήταν δυνατή η εύρεση αυτού του deck.",
  "errors.api.database_unavailable":
    "Η υπηρεσία δεν είναι προσωρινά διαθέσιμη. Δοκίμασε ξανά.",
  "errors.api.read_only": "Αυτό το deck είναι μόνο για ανάγνωση.",
  "errors.api.invalid_form": "Το αίτημα δεν ήταν έγκυρο.",
  "errors.api.missing_file": "Επίλεξε μια εικόνα για μεταφόρτωση.",
  "errors.api.image_too_large":
    "Οι εικόνες πρέπει να είναι {maxMb} MB ή μικρότερες.",
  "errors.api.unsupported_image": "Χρησιμοποίησε εικόνα PNG, JPEG ή WebP.",
  "errors.api.invalid_image": "Η εικόνα δεν είναι έγκυρη.",
  "errors.createDeck": "Δεν ήταν δυνατή η δημιουργία deck.",
  "errors.openDeck": "Δεν ήταν δυνατό το άνοιγμα αυτού του deck.",
  "errors.uploadImage": "Δεν ήταν δυνατή η μεταφόρτωση της εικόνας.",
  "errors.shareLinks":
    "Δεν ήταν δυνατή η δημιουργία των συνδέσμων κοινοποίησης.",
  "errors.exportPng": "Δεν ήταν δυνατή η εξαγωγή του PNG.",
  "errors.exportPdf": "Δεν ήταν δυνατή η εξαγωγή του PDF.",
  "errors.export.image":
    "Δεν ήταν δυνατή η φόρτωση μιας εικόνας. Η εξαγωγή ακυρώθηκε.",
  "errors.export.encode":
    "Δεν ήταν δυνατή η κωδικοποίηση της εικόνας της διαφάνειας.",
  "errors.image.unsupported": "Χρησιμοποίησε εικόνα PNG, JPEG ή WebP.",
  "errors.image.tooLarge":
    "Οι εικόνες πρέπει να είναι {maxMb} MB ή μικρότερες.",
  "errors.deck.addElement": "Δεν ήταν δυνατή η προσθήκη του στοιχείου.",
  "errors.deck.addText": "Δεν ήταν δυνατή η προσθήκη του κειμένου.",
  "errors.deck.duplicate": "Δεν ήταν δυνατός ο διπλασιασμός.",
  "errors.deck.delete": "Δεν ήταν δυνατή η διαγραφή.",
  "errors.deck.paste": "Δεν ήταν δυνατή η επικόλληση.",

  // Formatting
  "format.elements.one": "{count} στοιχείο",
  "format.elements.other": "{count} στοιχεία",
  "format.editing.one": "{count} σε επεξεργασία",
  "format.editing.other": "{count} σε επεξεργασία",

  // Metadata
  "metadata.title": "Mini Deck — Μικρά deck, ζωντανά μαζί",
  "metadata.description":
    "Μικρά deck διαφανειών που κοινοποιούνται εύκολα και χτίζονται μαζί σε πραγματικό χρόνο.",

  // Accessibility
  "a11y.language": "Γλώσσα",
  "a11y.languageOption": "Αλλαγή γλώσσας σε {language}",
  "a11y.selectElement": "Επιλογή στοιχείου: {type}",
};
