from scheduler.mep_optimizer import MEPGroupOptimizer, StudentRequest, TutorOffer

def test_solver():
    students = [
        StudentRequest("s1", "Carlos", "III Ciclo", ["mat_3", "esp_3"], ["mon_17", "mon_18", "mon_19"], 25000),
        StudentRequest("s2", "Juan", "III Ciclo", ["esp_3"], ["mon_17", "mon_18"], 18000)
    ]
    tutors = [
        TutorOffer("t1", "Prof Mora", 4000, ["III Ciclo"], ["mat_3", "esp_3"], ["mon_17", "mon_18", "mon_19"])
    ]
    
    optimizer = MEPGroupOptimizer(students, tutors)
    results = optimizer.solve()
    
    print("\n--- Optimization Results ---")
    for r in results:
        print(f"Slot: {r['slot']} | Sub: {r['subject']} | Profe: {r['tutor']}")
        print(f"Students: {', '.join(r['students'])}")
        print(f"Revenue: {r['total_revenue']} | Cost: {r['tutor_rate']} | Profit: {r['profit']}")
        print("-" * 30)

if __name__ == "__main__":
    test_solver()
