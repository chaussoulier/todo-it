import json
import os

TASKS_FILE = 'tasks.json'


def charger_taches():
    if not os.path.exists(TASKS_FILE) or os.stat(TASKS_FILE).st_size == 0:
        return []
    with open(TASKS_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def sauvegarder_taches(taches):
    with open(TASKS_FILE, 'w') as f:
        json.dump(taches, f, indent=2)

def menu():
    while True:
        print("\n--- Menu To-Do ---")
        print("1. Ajouter une tâche")
        print("2. Lister les tâches")
        print("3. Modifier le statut d'une tâche")
        print("4. Modifier une tâche")
        print("5. Supprimer une tâche")
        print("6. Filtrer par tag")
        print("7. Filtrer par statut")
        print("8. Importer des tâches")
        print("9. Quitter")

        choix = input("Choix : ")
        if choix == '1':
            ajouter_tache()
        elif choix == '2':
            lister_taches()
        elif choix == '3':
            changer_statut()
        elif choix == '4':
            modifier_tache()
        elif choix == '5':
            supprimer_tache()
        elif choix == '6':
            filtrer_par_tag()
        elif choix == '7':
            filtrer_par_statut()
        elif choix == '8':
            importer_taches()
        elif choix == '9':
            print("👋 À bientôt !")
            break
        else:
            print("❌ Option invalide.")


from datetime import datetime

def ajouter_tache():
    titre = input("Titre de la tâche : ")
    description = input("Description : ")
    tag = input("Tag (ex : perso, pro, urgent) : ").strip().lower()
    statut = input("Statut (À faire, En cours, Terminée) : ").strip().lower()

    if statut not in ["À faire", "En cours", "Terminée"]:
        print("❌ Statut invalide. Tâche non ajoutée.")
        return

    deadline = input("Deadline (AAAA-MM-JJ, optionnel) : ").strip()
    if deadline:
        try:
            datetime.strptime(deadline, "%Y-%m-%d")
        except ValueError:
            print("❌ Format de date invalide. Tâche non ajoutée.")
            return
    else:
        deadline = None

    taches = charger_taches()
    nouvelle_tache = {
        "id": len(taches) + 1,
        "titre": titre,
        "description": description,
        "tag": tag,
        "statut": statut,
        "deadline": deadline
    }
    taches.append(nouvelle_tache)
    sauvegarder_taches(taches)
    print("✅ Tâche ajoutée avec succès.\n")


def lister_taches():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche pour le moment.\n")
        return
    print("📋 Liste des tâches :\n")
    for tache in taches:
        print(f"[{tache['id']}] {tache['titre']} - {tache['statut']} [{tache.get('tag', '')}] - Deadline : {tache.get('deadline', 'Aucune')}")

def modifier_tache():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche à modifier.")
        return

    lister_taches()
    try:
        id_tache = int(input("ID de la tâche à modifier : "))
    except ValueError:
        print("❌ Entrée invalide.")
        return

    for tache in taches:
        if tache["id"] == id_tache:
            print(f"Tâche sélectionnée : {tache['titre']}")

            nouveau_titre = input(f"Nouveau titre (laisser vide pour garder '{tache['titre']}') : ")
            nouvelle_description = input(f"Nouvelle description (laisser vide pour garder l'existante) : ")
            nouveau_tag = input(f"Nouveau tag (actuel : {tache.get('tag', '')}) : ")
            nouveau_statut = input(f"Nouveau statut (À faire, En cours, Terminée) (actuel : {tache['statut']}) : ").strip().lower()
            nouveau_deadline = input(f"Nouveau deadline (laisser vide pour garder '{tache.get('deadline', 'Aucune')}') : ").strip()
            if nouveau_deadline:
                try:
                    datetime.strptime(nouveau_deadline, "%Y-%m-%d")
                except ValueError:
                    print("❌ Format de date invalide. Tâche non modifiée.")
                    return
            else:
                nouveau_deadline = None

            if nouveau_titre:
                tache["titre"] = nouveau_titre
            if nouvelle_description:
                tache["description"] = nouvelle_description
            if nouveau_tag:
                tache["tag"] = nouveau_tag
            if nouveau_statut in ["À faire", "En cours", "Terminée"]:
                tache["statut"] = nouveau_statut

            sauvegarder_taches(taches)
            print("✏️ Tâche modifiée avec succès.")
            return

    print("❌ Tâche introuvable.")

def changer_statut():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche à modifier.")
        return

    lister_taches()
    try:
        id_tache = int(input("ID de la tâche à modifier : "))
    except ValueError:
        print("❌ Entrée invalide.")
        return

    for tache in taches:
        if tache["id"] == id_tache:
            print(f"Tâche sélectionnée : {tache['titre']}")
            print("Nouveaux statuts possibles : À faire, En cours, Terminée")
            nouveau_statut = input("Nouveau statut : ").strip().lower()
            if nouveau_statut in ["À faire", "En cours", "Terminée"]:
                tache["statut"] = nouveau_statut
                sauvegarder_taches(taches)
                print("✅ Statut mis à jour.")
            else:
                print("❌ Statut non valide.")
            return

    print("❌ Tâche introuvable.")

def supprimer_tache():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche à supprimer.")
        return

    lister_taches()
    try:
        id_tache = int(input("ID de la tâche à supprimer : "))
    except ValueError:
        print("❌ Entrée invalide.")
        return

    nouvelle_liste = [t for t in taches if t["id"] != id_tache]

    if len(nouvelle_liste) == len(taches):
        print("❌ Aucune tâche supprimée. ID introuvable.")
        return

    # Réattribuer les ID proprement
    for i, tache in enumerate(nouvelle_liste, start=1):
        tache["id"] = i

    sauvegarder_taches(nouvelle_liste)
    print("🗑️ Tâche supprimée avec succès.")

def filtrer_par_tag():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche à afficher.")
        return

    tag_recherche = input("Tag à filtrer (ex : perso, pro, urgent) : ").strip().lower()
    taches_filtrees = [t for t in taches if t.get("tag", "").lower() == tag_recherche]

    if not taches_filtrees:
        print("🔍 Aucune tâche trouvée pour ce tag.")
        return

    print(f"\n📋 Tâches avec le tag '{tag_recherche}':\n")
    for t in taches_filtrees:
        print(f"[{t['id']}] {t['titre']} - {t['statut']} [{t.get('tag', '')}]")

def filtrer_par_statut():
    taches = charger_taches()
    if not taches:
        print("📭 Aucune tâche à afficher.")
        return

    statut_recherche = input("Statut à filtrer (À faire, En cours, Terminée) : ").strip().lower()
    if statut_recherche not in ["À faire", "En cours", "Terminée"]:
        print("❌ Statut invalide.")
        return

    taches_filtrees = [t for t in taches if t["statut"] == statut_recherche]

    if not taches_filtrees:
        print("🔍 Aucune tâche trouvée pour ce statut.")
        return

    print(f"\n📋 Tâches avec le statut '{statut_recherche}':\n")
    for t in taches_filtrees:
        print(f"[{t['id']}] {t['titre']} - {t['statut']} [{t.get('tag', '')}]")

def importer_taches():
    chemin_fichier = input("Chemin du fichier JSON à importer : ").strip()
    if not os.path.exists(chemin_fichier):
        print("❌ Fichier introuvable.")
        return
    
    try:
        with open(chemin_fichier, 'r') as f:
            taches_importees = json.load(f)
        
        if not isinstance(taches_importees, list):
            print("❌ Format de fichier invalide. Le fichier doit contenir une liste de tâches.")
            return
        
        taches_actuelles = charger_taches()
        id_max = max([t.get('id', 0) for t in taches_actuelles], default=0)
        
        for tache in taches_importees:
            # Vérifier que la tâche a les champs requis
            if not all(key in tache for key in ['titre', 'statut']):
                continue
                
            # Assigner un nouvel ID pour éviter les conflits
            id_max += 1
            tache['id'] = id_max
            taches_actuelles.append(tache)
        
        sauvegarder_taches(taches_actuelles)
        print(f"✅ {len(taches_importees)} tâches importées avec succès.")
    except json.JSONDecodeError:
        print("❌ Le fichier n'est pas un JSON valide.")
    except Exception as e:
        print(f"❌ Erreur lors de l'importation : {str(e)}")

if __name__ == '__main__':
    menu()
